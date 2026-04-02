package service

import (
	"archive/tar"
	"archive/zip"
	"compress/bzip2"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nwaples/rardecode"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/pkg/converter"
	"bw-ai-check/backend/pkg/dashscope"
	"bw-ai-check/backend/pkg/grader"
	"bw-ai-check/backend/pkg/uploader"
)

// ExamService 阅卷管理服务
type ExamService struct {
	db          *gorm.DB
	repo        *repository.AnswerFileRepository
	graderRepo  *repository.ExamGraderRepository
	uploader    *uploader.Uploader
	modelRepo   *repository.AIModelRepository
	logger      *zap.Logger
}

// NewExamService 创建阅卷管理服务
func NewExamService(db *gorm.DB, repo *repository.AnswerFileRepository, graderRepo *repository.ExamGraderRepository, up *uploader.Uploader, modelRepo *repository.AIModelRepository, logger *zap.Logger) *ExamService {
	return &ExamService{
		db:         db,
		repo:       repo,
		graderRepo: graderRepo,
		uploader:   up,
		modelRepo:  modelRepo,
		logger:     logger,
	}
}

// UploadFile 单文件上传（学生 & 教职工）
func (s *ExamService) UploadFile(access AccessContext, fh *multipart.FileHeader, examSessionID, classID, className string) (*model.AnswerFile, error) {
	if !isWordFile(fh.Filename) {
		return nil, fmt.Errorf("仅支持 .doc 或 .docx 格式的文件")
	}

	// 在 HTTP 请求上下文内同步读取文件字节，goroutine 里不能再 Open
	f, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("读取文件失败: %w", err)
	}
	fileBytes, err := io.ReadAll(f)
	f.Close()
	if err != nil {
		return nil, fmt.Errorf("读取文件失败: %w", err)
	}

	key := uploader.BuildKeyWithOwner(access.UserID, fh.Filename)
	result, err := s.uploader.UploadBytes(context.Background(), fileBytes, fh.Filename, key)
	if err != nil {
		return nil, fmt.Errorf("文件存储失败: %w", err)
	}

	uploaderName, uploaderType, fileClassID, fileClassName := s.resolveUploaderInfo(access, classID, className)

	record := &model.AnswerFile{
		ID:            newID("af"),
		ExamSessionID: examSessionID,
		UploaderID:    access.UserID,
		UploaderName:  uploaderName,
		UploaderType:  uploaderType,
		OriginalName:  fh.Filename,
		FileKey:       result.Key,
		FileURL:       result.URL,
		FileSize:      result.Size,
		ClassID:       fileClassID,
		ClassName:     fileClassName,
		Status:        "uploaded",
	}

	if err := s.repo.Create(record); err != nil {
		return nil, fmt.Errorf("保存文件记录失败: %w", err)
	}

	s.logger.Info("Answer file uploaded", zap.String("id", record.ID), zap.String("key", result.Key))

	// 异步阅卷：传字节切片（goroutine 内不再依赖 HTTP 请求上下文）
	go s.gradeWithAI(record, fileBytes)

	return record, nil
}

// gradeWithAI 后台使用 Eino 阅卷智能体对答题文件进行结构化阅卷
// 流程：Word → PNG 图片列表 → Eino Agent → 结构化 JSON 评分
func (s *ExamService) gradeWithAI(record *model.AnswerFile, fileBytes []byte) {
	defer func() {
		if r := recover(); r != nil {
			s.logger.Error("阅卷 goroutine panic", zap.String("fileID", record.ID), zap.Any("recover", r))
			_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("阅卷过程发生异常，请稍后重试或联系管理员。详情：%v", r))
		}
	}()

	// 1. 获取当前启用的模型配置
	aiModel, err := s.modelRepo.FindEnabled()
	if err != nil {
		msg := "未配置已启用的 AI 模型：请在「模型管理」中启用一个模型，并填写有效的 API Key 与 OpenAI 兼容接口地址（DashScope 应为 https://dashscope.aliyuncs.com/compatible-mode/v1）。"
		s.logger.Info("暂无启用的 AI 模型，跳过自动阅卷", zap.String("fileID", record.ID))
		_ = s.repo.SaveAIGradingFailure(record.ID, msg)
		return
	}

	modelName := aiModel.ModelName
	if modelName == "" {
		modelName = "qwen-vl-max"
	}

	if err := s.repo.UpdateStatus(record.ID, "grading"); err != nil {
		s.logger.Warn("更新阅卷状态为 grading 失败", zap.String("fileID", record.ID), zap.Error(err))
	}

	// 2. 将 Word 文档转为 PNG 图片（每页一张），最多处理 20 页
	pageImages, convErr := converter.DocToImages(fileBytes, record.OriginalName, 20)
	if convErr != nil {
		s.logger.Warn("文档转图失败，降级为文本阅卷", zap.Error(convErr))
		client := dashscope.New(aiModel.APIKey, aiModel.APIEndpoint)
		if textErr := s.gradeWithTextModel(client, record, fileBytes, modelName); textErr != nil {
			_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("文档转图失败且文本阅卷未成功：%v。若已安装 LibreOffice 仍失败，请检查服务器环境。", textErr))
		}
		return
	}

	s.logger.Info("文档已转换为图片页",
		zap.String("fileID", record.ID),
		zap.Int("pages", len(pageImages)),
	)

	agent, agentErr := grader.New(aiModel.APIKey, aiModel.APIEndpoint, modelName)
	if agentErr != nil {
		s.logger.Error("初始化阅卷智能体失败", zap.String("fileID", record.ID), zap.Error(agentErr))
		client := dashscope.New(aiModel.APIKey, aiModel.APIEndpoint)
		if textErr := s.gradeWithTextModel(client, record, fileBytes, modelName); textErr != nil {
			_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("无法初始化视觉阅卷模型：%v；文本降级也失败：%v", agentErr, textErr))
		}
		return
	}

	ctx := context.Background()
	var result *grader.GradingResult
	var gradeErr error
	for attempt := 1; attempt <= 3; attempt++ {
		if attempt > 1 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
		result, gradeErr = agent.Grade(ctx, pageImages)
		if gradeErr == nil {
			break
		}
		s.logger.Warn("视觉模型阅卷重试", zap.String("fileID", record.ID), zap.Int("attempt", attempt), zap.Error(gradeErr))
	}

	if gradeErr != nil {
		s.logger.Warn("视觉阅卷多次重试仍失败，尝试文本模型降级", zap.String("fileID", record.ID), zap.Error(gradeErr))
		client := dashscope.New(aiModel.APIKey, aiModel.APIEndpoint)
		if textErr := s.gradeWithTextModel(client, record, fileBytes, modelName); textErr != nil {
			hint := "调用大模型失败（常见原因：网络不稳定、VPN/代理中断、防火墙拦截访问 dashscope.aliyuncs.com）。"
			_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("%s\n视觉模型：%v\n文本降级：%v", hint, gradeErr, textErr))
		}
		return
	}

	// 视觉模型返回成功，但如果所有题目都标记"不可见"，说明图片质量不足以识别文字，降级到文本模型
	if visionResultUnreadable(result) {
		s.logger.Warn("视觉模型无法识别题目文字，降级为文本模型",
			zap.String("fileID", record.ID),
			zap.Int("questions", len(result.Questions)),
		)
		client := dashscope.New(aiModel.APIKey, aiModel.APIEndpoint)
		if textErr := s.gradeWithTextModel(client, record, fileBytes, modelName); textErr == nil {
			return // 文本模型已成功保存结果
		}
		s.logger.Warn("文本降级也失败，使用视觉模型的初步结果", zap.String("fileID", record.ID))
	}

	detailJSON, _ := json.Marshal(result)
	summary := fmt.Sprintf("AI总分：%d分\n%s", result.TotalScore, result.Summary)

	if err := s.repo.UpdateAIResult(record.ID, string(detailJSON), result.TotalScore, summary); err != nil {
		s.logger.Error("保存 AI 阅卷结果失败", zap.String("fileID", record.ID), zap.Error(err))
		_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("阅卷已完成但写入数据库失败：%v", err))
		return
	}

	s.logger.Info("AI 阅卷完成",
		zap.String("fileID", record.ID),
		zap.String("model", modelName),
		zap.Int("totalScore", result.TotalScore),
		zap.Int("questions", len(result.Questions)),
	)
}

// gradeWithTextModel 降级：使用 qwen-long + fileid:// 纯文本阅卷，输出结构化 JSON
func (s *ExamService) gradeWithTextModel(client *dashscope.Client, record *model.AnswerFile, fileBytes []byte, _ string) error {
	uploadResp, err := client.UploadFile(record.OriginalName, fileBytes)
	if err != nil {
		s.logger.Error("DashScope 文件上传失败", zap.String("fileID", record.ID), zap.Error(err))
		return err
	}

	const textModel = "qwen-long"
	const textPrompt = `你是一位专业的程序设计课程阅卷助手。请仔细阅读这份答题试卷文档，完成以下阅卷任务：

【第一步：识别题目】
按文档中的编号顺序，找出每一道题目：
- no：题目序号（与文档中的编号完全一致）
- title：逐字复制文档中该题的原始题目文字（最多 80 字，超出截断并加"…"）
- maxScore：若题目标注了分值则使用，否则按题目数量均分 100 分

【第二步：批改每道题】
找到该题对应的代码 / 文字答案，判断：
- correctRate：正确率（0~100 整数，综合逻辑正确性、语法正确性、覆盖题目要求的程度）
- score：correctRate > 60 得 maxScore，否则得 0
- errorPoints：具体错误列表（无错误则 []）
- correctApproach：正确解题思路（1~3 句话）
- answerCompletion：完整正确的代码答案

【输出格式】
严格输出如下 JSON，不要 markdown 代码块，不要其他任何文字：
{
  "questions": [
    {
      "no": 1,
      "title": "（原题文字逐字复制）",
      "maxScore": 20,
      "correctRate": 80,
      "score": 20,
      "errorPoints": ["错误描述"],
      "correctApproach": "正确思路",
      "answerCompletion": "完整正确代码"
    }
  ],
  "totalScore": 80,
  "summary": "综合评价（100 字以内）"
}

强制规则：score 只能是 0 或 maxScore，不能有中间值；no 必须与卷面编号一致。`

	var chatResp *dashscope.ChatResponse
	for attempt := 1; attempt <= 2; attempt++ {
		if attempt > 1 {
			time.Sleep(2 * time.Second)
		}
		chatResp, err = client.ChatWithFile(textModel, uploadResp.ID, textPrompt, true)
		if err == nil {
			break
		}
		s.logger.Warn("文本模型阅卷重试", zap.String("fileID", record.ID), zap.Int("attempt", attempt), zap.Error(err))
	}
	if err != nil {
		s.logger.Error("文本模型阅卷失败", zap.String("fileID", record.ID), zap.Error(err))
		return err
	}

	reply := chatResp.ReplyText()
	s.logger.Info("文本模型阅卷完成",
		zap.String("fileID", record.ID),
		zap.Int("totalTokens", chatResp.Usage.TotalTokens),
	)

	// 尝试解析为结构化 JSON
	result, parseErr := grader.ParseResult(reply)
	if parseErr != nil {
		// JSON 解析失败：降级为纯文本存储，前端将展示 AI 批注卡片
		s.logger.Warn("文本模型返回非 JSON 内容，降级存储为文本批注", zap.String("fileID", record.ID), zap.Error(parseErr))
		if storeErr := s.repo.UpdateAIResult(record.ID, "", 0, reply); storeErr != nil {
			s.logger.Error("保存文本阅卷结果失败", zap.String("fileID", record.ID), zap.Error(storeErr))
			return storeErr
		}
		return nil
	}

	detailJSON, _ := json.Marshal(result)
	summary := fmt.Sprintf("AI总分：%d分\n%s", result.TotalScore, result.Summary)
	if storeErr := s.repo.UpdateAIResult(record.ID, string(detailJSON), result.TotalScore, summary); storeErr != nil {
		s.logger.Error("保存文本阅卷结构化结果失败", zap.String("fileID", record.ID), zap.Error(storeErr))
		return storeErr
	}

	s.logger.Info("文本模型结构化阅卷完成",
		zap.String("fileID", record.ID),
		zap.Int("totalScore", result.TotalScore),
		zap.Int("questions", len(result.Questions)),
	)
	return nil
}

// visionResultUnreadable 判断视觉模型是否因图片质量不足而无法识别题目
func visionResultUnreadable(r *grader.GradingResult) bool {
	if r == nil || len(r.Questions) == 0 {
		return true
	}
	for _, q := range r.Questions {
		if !strings.Contains(q.Title, "不可见") && !strings.Contains(q.Title, "无法识别") {
			return false
		}
	}
	return true
}

// GetGradingDetail 获取阅卷明细（含权限校验）
func (s *ExamService) GetGradingDetail(access AccessContext, id string) (*model.AnswerFile, error) {
	file, err := s.repo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("文件不存在")
	}

	// 校验是否是周考/月考，以及当班老师的访问限制
	if err := s.checkGradingDetailAccess(access, file); err != nil {
		return nil, err
	}

	return file, nil
}

// SubmitManualReview 提交人工复阅结果
func (s *ExamService) SubmitManualReview(access AccessContext, id, comment string, score int) error {
	file, err := s.repo.FindByID(id)
	if err != nil {
		return fmt.Errorf("文件不存在")
	}

	// 检查是否为周考/月考
	var session model.ExamSession
	if err := s.db.Where("id = ?", file.ExamSessionID).First(&session).Error; err != nil {
		return fmt.Errorf("考次不存在")
	}
	if session.Type != "weekly" && session.Type != "monthly" {
		return fmt.Errorf("仅周考和月考支持人工复阅")
	}

	// 校验是否为该班级的指定阅卷老师
	_, graderErr := s.graderRepo.FindByGraderAndSession(access.UserID, file.ExamSessionID)
	if graderErr != nil {
		// 高权限角色（校/院/教务）也允许复阅
		if !isHighPrivilegeRole(access) {
			return fmt.Errorf("您不是该考次的指定阅卷老师，无权进行复阅")
		}
	}

	return s.repo.SaveManualReview(id, access.UserID, comment, score)
}

// checkGradingDetailAccess 校验阅卷明细访问权限
func (s *ExamService) checkGradingDetailAccess(access AccessContext, file *model.AnswerFile) error {
	// 学生只能看自己的文件
	if access.UserType == "student" {
		if file.UploaderID != access.UserID {
			return fmt.Errorf("无权查看他人阅卷明细")
		}
		return nil
	}

	// 高权限角色（校长/院长/教务）无限制
	if isHighPrivilegeRole(access) {
		return nil
	}

	// 检查是否为周考/月考
	var session model.ExamSession
	if err := s.db.Where("id = ?", file.ExamSessionID).First(&session).Error; err != nil {
		return nil // 查询失败不拦截
	}
	if session.Type != "weekly" && session.Type != "monthly" {
		return nil // 日考无限制
	}

	// 是否为该考次的阅卷老师
	_, graderErr := s.graderRepo.FindByGraderAndSession(access.UserID, file.ExamSessionID)
	if graderErr == nil {
		return nil // 阅卷老师有权限
	}

	// 当班老师：只有 reviewed 状态才能查看
	if file.Status != "reviewed" {
		return fmt.Errorf("阅卷老师尚未完成复阅，暂无权限查看")
	}
	return nil
}

// isHighPrivilegeRole 判断是否为校长/院长/教务等高权限角色
func isHighPrivilegeRole(access AccessContext) bool {
	return access.DataScope == "school" || access.DataScope == "college" || access.DataScope == "major"
}

// BatchUpload 压缩包批量上传（仅教职工）
func (s *ExamService) BatchUpload(access AccessContext, fh *multipart.FileHeader, examSessionID, classID, className string) ([]*model.AnswerFile, error) {
	if !isSupportedArchive(fh.Filename) {
		return nil, fmt.Errorf("支持的压缩格式: .zip .tar .tar.gz .tgz .tar.bz2 .rar")
	}

	// 将压缩包写入临时文件（zip/tar reader 需要随机访问）
	tmpFile, err := os.CreateTemp("", "exam-batch-*"+archiveSuffix(fh.Filename))
	if err != nil {
		return nil, fmt.Errorf("无法创建临时文件: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	src, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("无法读取压缩包: %w", err)
	}
	if _, err = io.Copy(tmpFile, src); err != nil {
		src.Close()
		return nil, fmt.Errorf("写入临时文件失败: %w", err)
	}
	src.Close()
	tmpFile.Close()

	uploaderName, uploaderType, fileClassID, fileClassName := s.resolveUploaderInfo(access, classID, className)
	batchID := newID("batch")
	var records []*model.AnswerFile

	err = extractWordFiles(tmpFile.Name(), fh.Filename, func(entryName string, reader io.Reader, _ int64) error {
		// 读取完整字节：io.ReadAll 对二进制安全，不经过 string 转换
		data, readErr := io.ReadAll(reader)
		if readErr != nil {
			return fmt.Errorf("读取条目 %s 失败: %w", entryName, readErr)
		}

		key := uploader.BuildKeyWithOwner(access.UserID, entryName)
		result, uploadErr := s.uploader.UploadBytes(context.Background(), data, entryName, key)
		if uploadErr != nil {
			return fmt.Errorf("上传 %s 失败: %w", entryName, uploadErr)
		}

		records = append(records, &model.AnswerFile{
			ID:            newID("af"),
			ExamSessionID: examSessionID,
			UploaderID:    access.UserID,
			UploaderName:  uploaderName,
			UploaderType:  uploaderType,
			OriginalName:  entryName,
			FileKey:       result.Key,
			FileURL:       result.URL,
			FileSize:      result.Size,
			ClassID:       fileClassID,
			ClassName:     fileClassName,
			BatchID:       batchID,
			Status:        "uploaded",
		})
		return nil
	})
	if err != nil {
		return nil, err
	}

	if len(records) == 0 {
		return nil, fmt.Errorf("压缩包中未找到 .doc 或 .docx 文件")
	}

	if err := s.repo.BatchCreate(records); err != nil {
		return nil, fmt.Errorf("保存文件记录失败: %w", err)
	}

	s.logger.Info("Batch upload completed",
		zap.String("batchId", batchID),
		zap.Int("count", len(records)),
	)
	return records, nil
}

// List 查询文件列表（含数据权限过滤）
//
//	学生：只看自己提交的文件
//	讲师（class scope）：看本班级全部文件；对周考/月考只看 reviewed，除非自己是阅卷老师
//	专业主任/院长/校长/教务：看全部
func (s *ExamService) List(access AccessContext, page, pageSize int, classID, examSessionID, cycleID string) ([]*model.AnswerFile, int64, error) {
	page, pageSize = normalizePage(page, pageSize)
	filter := repository.ListFilter{ExamSessionID: examSessionID, CycleID: cycleID}

	switch {
	case access.UserType == "student":
		filter.UploaderID = access.UserID

	case access.DataScope == "class":
		// 当班老师：班级范围；对周考/月考加访问限制
		if classID != "" {
			filter.ClassID = classID
		} else {
			filter.ClassID = access.DepartmentID
		}
		// 获取该老师担任阅卷老师的考次（这些考次不限制）
		grantedIDs, _ := s.graderRepo.FindSessionIDsByGrader(access.UserID)
		filter.RestrictWeeklyMonthly = true
		filter.GrantedSessionIDs = grantedIDs

	case access.DataScope == "school":
		// 校长/教务：全量，可选班级筛选
		filter.ClassID = classID

	default:
		// college/major：根据部门子树推导可访问班级
		if classID != "" {
			filter.ClassID = classID
		} else {
			accessible, err := resolveAccessibleDepartmentIDs(s.db, access)
			if err != nil {
				return nil, 0, err
			}
			filter.ClassIDs = idsFromSet(accessible)
		}
	}

	return s.repo.List(filter, page, pageSize)
}

// ClassOption 班级选项（用于前端筛选下拉）
type ClassOption struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// GetAccessibleClasses 返回当前用户可访问的班级列表
func (s *ExamService) GetAccessibleClasses(access AccessContext) ([]ClassOption, error) {
	switch access.DataScope {
	case "school":
		var depts []model.Department
		if err := s.db.Where("level = 'class'").Order("name").Find(&depts).Error; err != nil {
			return nil, err
		}
		result := make([]ClassOption, len(depts))
		for i, d := range depts {
			result[i] = ClassOption{ID: d.ID, Name: d.Name}
		}
		return result, nil

	case "class":
		var dept model.Department
		if err := s.db.Select("id, name").Where("id = ?", access.DepartmentID).First(&dept).Error; err != nil {
			return nil, nil
		}
		return []ClassOption{{ID: dept.ID, Name: dept.Name}}, nil

	default:
		accessible, err := resolveAccessibleDepartmentIDs(s.db, access)
		if err != nil {
			return nil, err
		}
		ids := idsFromSet(accessible)
		if len(ids) == 0 {
			return nil, nil
		}
		var depts []model.Department
		if err := s.db.Where("id IN ? AND level = 'class'", ids).Order("name").Find(&depts).Error; err != nil {
			return nil, err
		}
		result := make([]ClassOption, len(depts))
		for i, d := range depts {
			result[i] = ClassOption{ID: d.ID, Name: d.Name}
		}
		return result, nil
	}
}

// StreamFile 代理下载文件内容（用于前端预览，绕过 MinIO 直连限制）
func (s *ExamService) StreamFile(id string) (io.ReadCloser, int64, string, string, error) {
	file, err := s.repo.FindByID(id)
	if err != nil {
		return nil, 0, "", "", fmt.Errorf("文件不存在")
	}

	reader, size, contentType, err := s.uploader.GetObject(context.Background(), file.FileKey)
	if err != nil {
		return nil, 0, "", "", fmt.Errorf("获取文件内容失败: %w", err)
	}

	return reader, size, contentType, file.OriginalName, nil
}

// StreamFileAsDocx 获取文件并在需要时将 .doc 转换为 .docx 以供预览。
// 如果文件已经是 .docx 或转换不需要，直接返回原始流。
// 如果是 .doc 但 LibreOffice 未安装，返回 converter.ErrNotAvailable。
func (s *ExamService) StreamFileAsDocx(id string) (data []byte, originalName string, isConverted bool, err error) {
	file, err := s.repo.FindByID(id)
	if err != nil {
		return nil, "", false, fmt.Errorf("文件不存在")
	}

	reader, _, _, err := s.uploader.GetObject(context.Background(), file.FileKey)
	if err != nil {
		return nil, "", false, fmt.Errorf("获取文件内容失败: %w", err)
	}
	defer reader.Close()

	ext := strings.ToLower(filepath.Ext(file.OriginalName))

	// 如果不是需要转换的旧格式，直接读取原始内容
	if ext != ".doc" {
		raw, readErr := io.ReadAll(reader)
		if readErr != nil {
			return nil, "", false, fmt.Errorf("读取文件失败: %w", readErr)
		}
		return raw, file.OriginalName, false, nil
	}

	// .doc 格式尝试用 LibreOffice 转换
	converted, convErr := converter.DocToDocx(reader, file.OriginalName)
	if convErr != nil {
		return nil, "", false, convErr
	}

	convertedName := strings.TrimSuffix(file.OriginalName, filepath.Ext(file.OriginalName)) + ".docx"
	return converted, convertedName, true, nil
}

// Delete 删除文件
func (s *ExamService) Delete(access AccessContext, id string) error {
	file, err := s.repo.FindByID(id)
	if err != nil {
		return fmt.Errorf("文件不存在")
	}

	if access.DataScope == "class" && file.UploaderID != access.UserID {
		return fmt.Errorf("无权限删除他人文件")
	}

	if delErr := s.uploader.Delete(context.Background(), file.FileKey); delErr != nil {
		s.logger.Warn("Storage delete failed", zap.String("key", file.FileKey), zap.Error(delErr))
	}

	return s.repo.Delete(id)
}

// ========== 内部辅助 ==========

func (s *ExamService) resolveUploaderInfo(access AccessContext, classID, className string) (name, typ, cid, cname string) {
	var user model.User
	if err := s.db.Select("name, user_type, class_id, class_name").
		Where("id = ?", access.UserID).First(&user).Error; err == nil {
		name = user.Name
		typ = user.UserType
	} else {
		typ = "staff"
	}

	if typ == "student" {
		// 学生：班级来自自身档案
		if classID == "" && user.ClassID != nil {
			cid = *user.ClassID
		} else {
			cid = classID
		}
		if className == "" && user.ClassName != nil {
			cname = *user.ClassName
		} else {
			cname = className
		}
	} else {
		// 教职工：优先使用传入参数，没有则用 DepartmentID（讲师的部门即其班级）
		if classID != "" {
			cid = classID
			cname = className
		} else {
			cid = access.DepartmentID
			// 查询部门名称
			var dept model.Department
			if s.db.Select("name").Where("id = ?", access.DepartmentID).First(&dept).Error == nil {
				cname = dept.Name
			}
		}
	}
	return
}

func isWordFile(name string) bool {
	lower := strings.ToLower(name)
	return strings.HasSuffix(lower, ".doc") || strings.HasSuffix(lower, ".docx")
}

// isMacHiddenFile 过滤 macOS 打包时自动插入的隐藏文件：
//   - ._filename（资源分叉，AppleDouble 格式）
//   - __MACOSX/ 目录下的所有条目
//   - .DS_Store
func isMacHiddenFile(name string) bool {
	base := filepath.Base(name)
	if strings.HasPrefix(base, "._") || base == ".DS_Store" {
		return true
	}
	// 路径中含 __MACOSX 目录
	slashed := filepath.ToSlash(name)
	return strings.Contains(slashed, "__MACOSX/")
}

func isSupportedArchive(name string) bool {
	lower := strings.ToLower(name)
	for _, ext := range []string{".zip", ".tar.gz", ".tgz", ".tar.bz2", ".tbz2", ".tar", ".rar"} {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	return false
}

// archiveSuffix 提取压缩包的复合后缀用于临时文件命名
func archiveSuffix(name string) string {
	lower := strings.ToLower(name)
	for _, ext := range []string{".tar.gz", ".tar.bz2", ".tbz2", ".tgz"} {
		if strings.HasSuffix(lower, ext) {
			return ext
		}
	}
	return filepath.Ext(name)
}

// extractWordFiles 从压缩包中提取所有 Word 文件，对每个有效条目调用 fn
func extractWordFiles(archivePath, archiveName string, fn func(name string, r io.Reader, size int64) error) error {
	lower := strings.ToLower(archiveName)
	switch {
	case strings.HasSuffix(lower, ".zip"):
		return extractZip(archivePath, fn)
	case strings.HasSuffix(lower, ".tar.gz") || strings.HasSuffix(lower, ".tgz"):
		return extractTar(archivePath, "gzip", fn)
	case strings.HasSuffix(lower, ".tar.bz2") || strings.HasSuffix(lower, ".tbz2"):
		return extractTar(archivePath, "bzip2", fn)
	case strings.HasSuffix(lower, ".tar"):
		return extractTar(archivePath, "", fn)
	case strings.HasSuffix(lower, ".rar"):
		return extractRar(archivePath, fn)
	default:
		return fmt.Errorf("不支持的压缩格式: %s", archiveName)
	}
}

func extractZip(archivePath string, fn func(string, io.Reader, int64) error) error {
	r, err := zip.OpenReader(archivePath)
	if err != nil {
		return fmt.Errorf("无法打开 ZIP 文件: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		if f.FileInfo().IsDir() || isMacHiddenFile(f.Name) || !isWordFile(f.Name) {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return fmt.Errorf("无法读取 ZIP 条目 %s: %w", f.Name, err)
		}
		baseName := filepath.Base(f.Name)
		err = fn(baseName, rc, int64(f.UncompressedSize64))
		rc.Close()
		if err != nil {
			return err
		}
	}
	return nil
}

func extractTar(archivePath, compressor string, fn func(string, io.Reader, int64) error) error {
	f, err := os.Open(archivePath)
	if err != nil {
		return fmt.Errorf("无法打开文件: %w", err)
	}
	defer f.Close()

	var r io.Reader = f
	switch compressor {
	case "gzip":
		gr, err := gzip.NewReader(f)
		if err != nil {
			return fmt.Errorf("无法解压 gzip: %w", err)
		}
		defer gr.Close()
		r = gr
	case "bzip2":
		r = bzip2.NewReader(f)
	}

	tr := tar.NewReader(r)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("读取 TAR 条目失败: %w", err)
		}
		if hdr.Typeflag == tar.TypeDir || isMacHiddenFile(hdr.Name) || !isWordFile(hdr.Name) {
			continue
		}
		if err := fn(filepath.Base(hdr.Name), tr, hdr.Size); err != nil {
			return err
		}
	}
	return nil
}

func extractRar(archivePath string, fn func(string, io.Reader, int64) error) error {
	r, err := rardecode.OpenReader(archivePath, "")
	if err != nil {
		return fmt.Errorf("无法打开 RAR 文件: %w", err)
	}
	defer r.Close()

	for {
		hdr, err := r.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("读取 RAR 条目失败: %w", err)
		}
		if hdr.IsDir || isMacHiddenFile(hdr.Name) || !isWordFile(hdr.Name) {
			continue
		}
		if err := fn(filepath.Base(hdr.Name), r, hdr.UnPackedSize); err != nil {
			return err
		}
	}
	return nil
}
