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
	"slices"
	"strings"

	"github.com/nwaples/rardecode"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/pkg/converter"
	"bw-ai-check/backend/pkg/grader"
	"bw-ai-check/backend/pkg/uploader"
)

// ExamService 阅卷管理服务
type ExamService struct {
	db         *gorm.DB
	repo       *repository.AnswerFileRepository
	graderRepo *repository.ExamGraderRepository
	uploader   *uploader.Uploader
	modelRepo  *repository.AIModelRepository
	logger     *zap.Logger
}

type batchGradeTask struct {
	record    *model.AnswerFile
	fileBytes []byte
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

	// minio文件上传的key
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
// gradeWithAI 使用「模型管理」中启用的模型（通过阅卷智能体）对答题文档进行阅卷。
func (s *ExamService) gradeWithAI(record *model.AnswerFile, fileBytes []byte) {
	defer func() {
		if r := recover(); r != nil {
			s.logger.Error("阅卷 goroutine panic", zap.String("fileID", record.ID), zap.Any("recover", r))
			_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("阅卷过程发生异常，请稍后重试或联系管理员。详情：%v", r))
		}
	}()

	aiModel, err := s.modelRepo.FindEnabled()
	if err != nil {
		s.logger.Info("暂无启用的 AI 模型，跳过自动阅卷", zap.String("fileID", record.ID))
		_ = s.repo.SaveAIGradingFailure(record.ID, "未配置已启用的 AI 模型：请在「模型管理」中启用一个模型并填写有效的 API Key。")
		return
	}
	if aiModel.ModelName == "" {
		_ = s.repo.SaveAIGradingFailure(record.ID, "模型型号未填写：请在「模型管理」中为启用的模型填写「模型型号」字段。")
		return
	}

	if err := s.repo.UpdateStatus(record.ID, "grading"); err != nil {
		s.logger.Warn("更新阅卷状态为 grading 失败", zap.String("fileID", record.ID), zap.Error(err))
	}

	agent, err := grader.New(aiModel.APIKey, aiModel.APIEndpoint, aiModel.ModelName)
	if err != nil {
		_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("初始化阅卷智能体失败：%v", err))
		return
	}

	s.logger.Info("开始阅卷",
		zap.String("fileID", record.ID),
		zap.String("model", aiModel.ModelName),
		zap.String("provider", aiModel.Provider),
	)

	result, err := agent.Grade(fileBytes, record.OriginalName)
	if err != nil {
		hint := fmt.Sprintf("阅卷失败（模型：%q）。请检查「模型管理」中的 API Key 和 API Endpoint 是否填写正确。", aiModel.ModelName)
		_ = s.repo.SaveAIGradingFailure(record.ID, fmt.Sprintf("%s\n详情：%v", hint, err))
		return
	}

	detailJSON, _ := json.Marshal(result)
	summary := fmt.Sprintf("AI总分：%d分\n%s", result.TotalScore, result.Summary)
	if err := s.repo.UpdateAIResult(record.ID, string(detailJSON), result.TotalScore, summary); err != nil {
		s.logger.Error("保存阅卷结果失败", zap.String("fileID", record.ID), zap.Error(err))
		return
	}

	s.logger.Info("阅卷完成",
		zap.String("fileID", record.ID),
		zap.String("method", result.Method),
		zap.Int("totalScore", result.TotalScore),
		zap.Int("questions", len(result.Questions)),
	)
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

// ManualQuestionScore 单题人工评分
type ManualQuestionScore struct {
	No    int `json:"no"`
	Score int `json:"score"`
}

// SubmitManualReview 提交人工复阅结果（逐题评分模式）
// questionScores 为每道题的评分列表，总分自动汇总；comment 为整体批注
func (s *ExamService) SubmitManualReview(access AccessContext, id, comment string, questionScores []ManualQuestionScore) error {
	file, err := s.repo.FindByID(id)
	if err != nil {
		return fmt.Errorf("文件不存在")
	}

	// 校验是否为该班级的指定阅卷老师
	_, graderErr := s.graderRepo.FindByGraderAndSession(access.UserID, file.ExamSessionID)
	if graderErr != nil {
		// 高权限角色（校/院/教务）也允许复阅
		if !isHighPrivilegeRole(access) {
			return fmt.Errorf("您不是该考次的指定阅卷老师，无权进行复阅")
		}
	}

	// 计算总分
	total := 0
	for _, qs := range questionScores {
		total += qs.Score
	}

	// 序列化逐题评分为 JSON
	detailBytes, err := json.Marshal(questionScores)
	if err != nil {
		return fmt.Errorf("序列化逐题评分失败: %w", err)
	}

	return s.repo.SaveManualReview(id, access.UserID, comment, total, string(detailBytes))
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

	// 当班讲师可查看自己班级下的全部记录，含周考/月考上传明细。
	if access.DataScope == "class" {
		if file.ClassID != access.DepartmentID {
			return fmt.Errorf("无权查看该班级的阅卷明细")
		}
		return nil
	}

	accessible, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return err
	}
	if !departmentAccessible(accessible, file.ClassID) {
		return fmt.Errorf("无权查看该班级的阅卷明细")
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
	if uploaderType == "staff" {
		uploaderType = "student"
		if archiveName := archiveDisplayName(fh.Filename); archiveName != "" {
			uploaderName = archiveName
		}
	}
	batchID := newID("batch")
	var records []*model.AnswerFile
	var gradeTasks []batchGradeTask

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

		record := &model.AnswerFile{
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
		}
		records = append(records, record)
		gradeTasks = append(gradeTasks, batchGradeTask{
			record:    record,
			fileBytes: data,
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

	for _, task := range gradeTasks {
		record := task.record
		fileBytes := task.fileBytes
		go s.gradeWithAI(record, fileBytes)
	}

	return records, nil
}

// List 查询文件列表（含数据权限过滤）
//
//	学生：只看自己提交的文件
//	讲师（class scope）：看本班级全部文件
//	专业主任/院长/校长/教务：看全部
func (s *ExamService) List(access AccessContext, page, pageSize int, classID, examSessionID, cycleID string) ([]*model.AnswerFile, int64, error) {
	page, pageSize = normalizePage(page, pageSize)
	filter := repository.ListFilter{ExamSessionID: examSessionID, CycleID: cycleID}

	switch {
	case access.UserType == "student":
		filter.UploaderID = access.UserID

	case access.DataScope == "class":
		// 当班老师：班级范围内的上传记录全部可见
		if classID != "" {
			filter.ClassID = classID
		} else {
			filter.ClassID = access.DepartmentID
		}

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
	depts, err := loadDepartments(s.db)
	if err != nil {
		return nil, fmt.Errorf("读取组织架构失败: %w", err)
	}

	items := make([]ClassOption, 0)
	for _, dept := range depts {
		if dept.Level != "class" {
			continue
		}
		items = append(items, ClassOption{
			ID:   dept.ID,
			Name: buildDepartmentPathName(dept.ID, depts),
		})
	}

	switch access.DataScope {
	case "school":
		slices.SortFunc(items, func(a, b ClassOption) int { return strings.Compare(a.Name, b.Name) })
		return items, nil

	case "class":
		for _, item := range items {
			if item.ID == access.DepartmentID {
				return []ClassOption{item}, nil
			}
		}
		return nil, nil

	default:
		accessible, err := resolveAccessibleDepartmentIDs(s.db, access)
		if err != nil {
			return nil, err
		}
		if len(accessible) == 0 {
			return nil, nil
		}
		filtered := make([]ClassOption, 0, len(items))
		for _, item := range items {
			if _, ok := accessible[item.ID]; ok {
				filtered = append(filtered, item)
			}
		}
		slices.SortFunc(filtered, func(a, b ClassOption) int { return strings.Compare(a.Name, b.Name) })
		return filtered, nil
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
		// 学生：班级始终来自 DB 档案，忽略前端传入的 classID/className
		if user.ClassID != nil {
			cid = *user.ClassID
		}
		if user.ClassName != nil {
			cname = *user.ClassName
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

func archiveDisplayName(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	if base == "" {
		return ""
	}

	suffix := archiveSuffix(base)
	if suffix != "" && strings.HasSuffix(strings.ToLower(base), strings.ToLower(suffix)) {
		base = base[:len(base)-len(suffix)]
	}
	return strings.TrimSpace(base)
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
