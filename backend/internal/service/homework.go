package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"slices"
	"strings"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/pkg/homeworkparser"
	"bw-ai-check/backend/pkg/homeworkreview"
	"bw-ai-check/backend/pkg/uploader"
)

// HomeworkClassOption 前端可选班级项
type HomeworkClassOption struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CollegeName string `json:"collegeName"`
	MajorName   string `json:"majorName"`
	ClassName   string `json:"className"`
}

// HomeworkMissingItem 未上传学生项
type HomeworkMissingItem struct {
	HomeworkID    string `json:"homeworkId"`
	HomeworkTitle string `json:"homeworkTitle"`
	CheckDate     string `json:"checkDate"`
	ClassID       string `json:"classId"`
	ClassName     string `json:"className"`
	StudentID     string `json:"studentId"`
	StudentName   string `json:"studentName"`
}

// HomeworkService 作业审批服务
type HomeworkService struct {
	db             *gorm.DB
	taskRepo       *repository.HomeworkTaskRepository
	submissionRepo *repository.HomeworkSubmissionRepository
	modelRepo      *repository.AIModelRepository
	uploader       *uploader.Uploader
	logger         *zap.Logger
}

// NewHomeworkService 创建作业审批服务
func NewHomeworkService(
	db *gorm.DB,
	taskRepo *repository.HomeworkTaskRepository,
	submissionRepo *repository.HomeworkSubmissionRepository,
	modelRepo *repository.AIModelRepository,
	up *uploader.Uploader,
	logger *zap.Logger,
) *HomeworkService {
	return &HomeworkService{
		db:             db,
		taskRepo:       taskRepo,
		submissionRepo: submissionRepo,
		modelRepo:      modelRepo,
		uploader:       up,
		logger:         logger,
	}
}

// GetAccessibleClasses 返回当前用户可访问班级。
func (s *HomeworkService) GetAccessibleClasses(access AccessContext) ([]HomeworkClassOption, error) {
	return s.getAccessibleClasses(access)
}

// UploadSubmission 学生上传当天作业压缩包并触发自动审批。
func (s *HomeworkService) UploadSubmission(access AccessContext, fh *multipart.FileHeader) (*model.HomeworkSubmission, error) {
	if access.UserType != "student" {
		return nil, fmt.Errorf("只有学生可以上传作业")
	}
	if fh == nil {
		return nil, fmt.Errorf("请选择作业压缩包")
	}
	file, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("读取上传文件失败: %w", err)
	}
	fileBytes, err := io.ReadAll(file)
	file.Close()
	if err != nil {
		return nil, fmt.Errorf("读取上传文件失败: %w", err)
	}

	student, err := s.getStudentProfile(access.UserID)
	if err != nil {
		return nil, err
	}
	if student.ClassID == nil || strings.TrimSpace(*student.ClassID) == "" {
		return nil, fmt.Errorf("学生未绑定班级，无法提交作业")
	}
	if strings.TrimSpace(valueOrEmpty(student.ClassName)) == "" {
		return nil, fmt.Errorf("学生班级信息不完整，无法提交作业")
	}

	today := time.Now().Format("2006-01-02")
	task, err := s.getOrCreateTodayTask(today)
	if err != nil {
		return nil, err
	}

	parsed, err := homeworkparser.ParseArchive(fileBytes, fh.Filename)
	if err != nil {
		return nil, err
	}

	archiveKey := strings.Replace(uploader.BuildKeyWithOwner(access.UserID, fh.Filename), "exam-papers/", "homework/", 1)
	archiveResult, err := s.uploader.UploadBytes(context.Background(), fileBytes, fh.Filename, archiveKey)
	if err != nil {
		return nil, fmt.Errorf("存储作业压缩包失败: %w", err)
	}

	docKey := strings.Replace(uploader.BuildKeyWithOwner(access.UserID, parsed.DocOriginalName), "exam-papers/", "homework/", 1)
	docResult, err := s.uploader.UploadBytes(context.Background(), parsed.DocBytes, parsed.DocOriginalName, docKey)
	if err != nil {
		return nil, fmt.Errorf("存储作业文档失败: %w", err)
	}

	submission, err := s.submissionRepo.FindByHomeworkAndStudent(task.ID, access.UserID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("读取历史提交失败: %w", err)
	}

	now := time.Now()
	if submission == nil {
		submission = &model.HomeworkSubmission{
			ID:          newID("hws"),
			HomeworkID:  task.ID,
			StudentID:   student.ID,
			StudentName: student.Name,
			ClassID:     valueOrEmpty(student.ClassID),
			ClassName:   valueOrEmpty(student.ClassName),
		}
	}

	submission.ArchiveFileKey = archiveResult.Key
	submission.ArchiveOriginalName = fh.Filename
	submission.DocFileKey = docResult.Key
	submission.DocOriginalName = parsed.DocOriginalName
	submission.DocContent = parsed.DocContent
	submission.CodeSummary = parsed.CodeSummary
	submission.ReviewStatus = "uploaded"
	submission.ReviewScore = 0
	submission.ReviewComment = strings.Join(parsed.Warnings, "；")
	submission.ReviewDetail = ""
	submission.SubmittedAt = now
	submission.ReviewedAt = nil

	if submission.CreatedAt.IsZero() {
		if err := s.submissionRepo.Create(submission); err != nil {
			return nil, fmt.Errorf("保存作业提交失败: %w", err)
		}
	} else {
		if err := s.submissionRepo.Save(submission); err != nil {
			return nil, fmt.Errorf("更新作业提交失败: %w", err)
		}
	}

	go s.reviewSubmissionWithAI(submission.ID, parsed.DocContent, parsed.CodeSummary, parsed.Warnings)
	return s.GetSubmissionDetail(access, submission.ID)
}

// ListMySubmissions 查询学生自己的作业提交。
func (s *HomeworkService) ListMySubmissions(access AccessContext, page, pageSize int) ([]model.HomeworkSubmission, int64, error) {
	page, pageSize = normalizePage(page, pageSize)
	return s.submissionRepo.List(repository.HomeworkSubmissionListFilter{
		StudentID:     access.UserID,
		SubmittedDate: time.Now().Format("2006-01-02"),
		Page:          page,
		PageSize:      pageSize,
	})
}

// ListSubmissions 查询管理侧作业提交。
func (s *HomeworkService) ListSubmissions(access AccessContext, page, pageSize int, homeworkID, classID, status string) ([]model.HomeworkSubmission, int64, error) {
	page, pageSize = normalizePage(page, pageSize)
	classOptions, err := s.getAccessibleClasses(access)
	if err != nil {
		return nil, 0, err
	}
	_, classIDs, err := s.filterHomeworkClassesByDepartment(access, classOptions, classID)
	if err != nil {
		return nil, 0, err
	}

	filter := repository.HomeworkSubmissionListFilter{
		HomeworkID:    homeworkID,
		ClassIDs:      classIDs,
		SubmittedDate: time.Now().Format("2006-01-02"),
		Page:          page,
		PageSize:      pageSize,
	}
	if access.UserType == "student" {
		filter.StudentID = access.UserID
	}
	if strings.TrimSpace(status) != "" {
		filter.Statuses = []string{status}
	}
	items, total, err := s.submissionRepo.List(filter)
	if err != nil {
		return nil, 0, fmt.Errorf("查询作业提交失败: %w", err)
	}
	return items, total, nil
}

// GetSubmissionDetail 查询单条作业提交详情。
func (s *HomeworkService) GetSubmissionDetail(access AccessContext, id string) (*model.HomeworkSubmission, error) {
	submission, err := s.submissionRepo.FindByID(id)
	if err != nil {
		return nil, fmt.Errorf("作业提交不存在")
	}
	if err := s.ensureSubmissionAccess(access, submission); err != nil {
		return nil, err
	}
	return submission, nil
}

// ListMissing 查询当天未上传的学生。
func (s *HomeworkService) ListMissing(access AccessContext, checkDate, classID string) ([]HomeworkMissingItem, error) {
	if access.UserType == "student" {
		return nil, fmt.Errorf("学生不能查看未上传统计")
	}
	if strings.TrimSpace(checkDate) == "" {
		checkDate = time.Now().Format("2006-01-02")
	}

	classOptions, err := s.getAccessibleClasses(access)
	if err != nil {
		return nil, err
	}
	classIDs := []string{}
	classOptions, classIDs, err = s.filterHomeworkClassesByDepartment(access, classOptions, classID)
	if err != nil {
		return nil, err
	}

	students, err := s.listStudentsByClasses(classIDs)
	if err != nil {
		return nil, err
	}
	studentsByClass := make(map[string][]model.User)
	for _, student := range students {
		if student.ClassID == nil || *student.ClassID == "" {
			continue
		}
		studentsByClass[*student.ClassID] = append(studentsByClass[*student.ClassID], student)
	}

	type submittedRow struct {
		StudentID string `gorm:"column:student_id"`
	}
	var submittedRows []submittedRow
	if err := s.db.Table("homework_submissions").
		Select("DISTINCT student_id").
		Where("class_id IN ?", classIDs).
		Where("DATE(submitted_at) = ?", checkDate).
		Scan(&submittedRows).Error; err != nil {
		return nil, fmt.Errorf("读取已提交名单失败: %w", err)
	}
	submittedSet := make(map[string]struct{}, len(submittedRows))
	for _, item := range submittedRows {
		submittedSet[item.StudentID] = struct{}{}
	}

	result := make([]HomeworkMissingItem, 0)
	for _, classIDItem := range classIDs {
		classStudents := studentsByClass[classIDItem]
		if len(classStudents) == 0 {
			continue
		}
		className := classNameFromOptions(classOptions, classIDItem)
		for _, student := range classStudents {
			if _, ok := submittedSet[student.ID]; ok {
				continue
			}
			result = append(result, HomeworkMissingItem{
				HomeworkID:    "homework-today",
				HomeworkTitle: "当天作业",
				CheckDate:     checkDate,
				ClassID:       classIDItem,
				ClassName:     className,
				StudentID:     student.ID,
				StudentName:   student.Name,
			})
		}
	}
	return result, nil
}

func (s *HomeworkService) reviewSubmissionWithAI(submissionID, docContent, codeSummary string, warnings []string) {
	finished := false
	defer func() {
		if finished {
			return
		}
		if r := recover(); r != nil {
			s.logger.Error("作业审批 goroutine panic", zap.String("submissionID", submissionID), zap.Any("recover", r))
			s.saveReviewFailure(submissionID, append(warnings, fmt.Sprintf("AI 审批异常中断：%v", r)))
		}
	}()

	if err := s.updateSubmissionStatus(submissionID, "parsing"); err != nil {
		s.logger.Warn("更新作业解析状态失败", zap.String("submissionID", submissionID), zap.Error(err))
	}

	aiModel, err := s.modelRepo.FindEnabled()
	if err != nil {
		s.saveReviewFailure(submissionID, append(warnings, "未配置已启用的 AI 模型"))
		finished = true
		return
	}
	if strings.TrimSpace(aiModel.ModelName) == "" {
		s.saveReviewFailure(submissionID, append(warnings, "已启用模型缺少模型名称"))
		finished = true
		return
	}

	if err := s.updateSubmissionStatus(submissionID, "reviewing"); err != nil {
		s.logger.Warn("更新作业审批状态失败", zap.String("submissionID", submissionID), zap.Error(err))
	}
	s.logger.Info("开始作业 AI 审批", zap.String("submissionID", submissionID), zap.Int("warningCount", len(warnings)))

	agent, err := homeworkreview.New(aiModel.APIKey, aiModel.APIEndpoint, aiModel.ModelName)
	if err != nil {
		s.saveReviewFailure(submissionID, append(warnings, fmt.Sprintf("初始化审批智能体失败：%v", err)))
		finished = true
		return
	}

	result, err := agent.Review(docContent, codeSummary)
	if err != nil {
		s.logger.Warn("作业 AI 审批失败", zap.String("submissionID", submissionID), zap.Error(err))
		s.saveReviewFailure(submissionID, append(warnings, fmt.Sprintf("AI 审批失败：%v", err)))
		finished = true
		return
	}

	detailBytes, _ := json.Marshal(result)
	comment := result.Summary
	if len(warnings) > 0 {
		comment = strings.TrimSpace(comment + "\n\n解析提醒：" + strings.Join(warnings, "；"))
	}
	status := "approved"
	if !result.Passed {
		status = "rejected"
	}
	reviewedAt := time.Now()
	err = s.db.Model(&model.HomeworkSubmission{}).
		Where("id = ?", submissionID).
		Updates(map[string]any{
			"review_status":  status,
			"review_score":   result.Score,
			"review_comment": comment,
			"review_detail":  string(detailBytes),
			"reviewed_at":    &reviewedAt,
		}).Error
	if err != nil {
		s.logger.Error("保存作业审批结果失败", zap.String("submissionID", submissionID), zap.Error(err))
		s.saveReviewFailure(submissionID, append(warnings, fmt.Sprintf("保存作业审批结果失败：%v", err)))
		finished = true
		return
	}
	finished = true
	s.logger.Info("作业 AI 审批完成", zap.String("submissionID", submissionID), zap.String("status", status), zap.Int("score", result.Score))
}

func (s *HomeworkService) saveReviewFailure(submissionID string, warnings []string) {
	comment := strings.Join(warnings, "；")
	if strings.TrimSpace(comment) == "" {
		comment = "作业审批失败"
	}
	reviewedAt := time.Now()
	if err := s.db.Model(&model.HomeworkSubmission{}).
		Where("id = ?", submissionID).
		Updates(map[string]any{
			"review_status":  "failed",
			"review_score":   0,
			"review_comment": comment,
			"review_detail":  "",
			"reviewed_at":    &reviewedAt,
		}).Error; err != nil {
		s.logger.Error("保存作业审批失败状态失败", zap.String("submissionID", submissionID), zap.Error(err))
	}
}

func (s *HomeworkService) updateSubmissionStatus(submissionID, status string) error {
	return s.db.Model(&model.HomeworkSubmission{}).
		Where("id = ?", submissionID).
		Update("review_status", status).Error
}

func (s *HomeworkService) ensureSubmissionAccess(access AccessContext, submission *model.HomeworkSubmission) error {
	if access.UserType == "student" {
		if submission.StudentID != access.UserID {
			return fmt.Errorf("无权查看他人的作业明细")
		}
		return nil
	}
	classMap, err := s.getAccessibleClassMap(access)
	if err != nil {
		return err
	}
	if _, ok := classMap[submission.ClassID]; !ok {
		return fmt.Errorf("无权查看该作业明细")
	}
	return nil
}

func (s *HomeworkService) getStudentProfile(userID string) (*model.User, error) {
	var user model.User
	err := s.db.Model(&model.User{}).
		Select("id, name, class_id, class_name").
		Where("id = ? AND user_type = ?", userID, "student").
		First(&user).Error
	if err != nil {
		return nil, fmt.Errorf("学生信息不存在")
	}
	return &user, nil
}

func (s *HomeworkService) listStudentsByClasses(classIDs []string) ([]model.User, error) {
	if len(classIDs) == 0 {
		return []model.User{}, nil
	}
	var users []model.User
	err := s.db.Model(&model.User{}).
		Select("id, name, class_id, class_name").
		Where("user_type = ?", "student").
		Where("class_id IN ?", classIDs).
		Order("class_name ASC, name ASC").
		Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("读取学生名单失败: %w", err)
	}
	return users, nil
}

func (s *HomeworkService) getAccessibleClasses(access AccessContext) ([]HomeworkClassOption, error) {
	depts, err := loadDepartments(s.db)
	if err != nil {
		return nil, fmt.Errorf("读取组织架构失败: %w", err)
	}

	if access.UserType == "student" {
		student, err := s.getStudentProfile(access.UserID)
		if err != nil {
			return nil, err
		}
		if student.ClassID == nil || *student.ClassID == "" {
			return []HomeworkClassOption{}, nil
		}
		name := buildDepartmentPathName(*student.ClassID, depts)
		collegeName, majorName, className := splitDepartmentPath(name)
		if name == "" {
			name = valueOrEmpty(student.ClassName)
		}
		if name == "" {
			name = student.Name
		}
		return []HomeworkClassOption{{
			ID:          *student.ClassID,
			Name:        name,
			CollegeName: collegeName,
			MajorName:   majorName,
			ClassName:   chooseNonEmpty(className, valueOrEmpty(student.ClassName), student.Name),
		}}, nil
	}

	items := make([]HomeworkClassOption, 0)
	for _, dept := range depts {
		if dept.Level != "class" {
			continue
		}
		items = append(items, HomeworkClassOption{
			ID:   dept.ID,
			Name: buildDepartmentPathName(dept.ID, depts),
		})
	}
	for idx := range items {
		items[idx].CollegeName, items[idx].MajorName, items[idx].ClassName = splitDepartmentPath(items[idx].Name)
	}

	if access.DataScope != "" && access.DataScope != "school" {
		accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
		if err != nil {
			return nil, fmt.Errorf("解析班级权限失败: %w", err)
		}
		if len(accessibleDeptIDs) == 0 {
			return []HomeworkClassOption{}, nil
		}
		filtered := make([]HomeworkClassOption, 0, len(items))
		for _, item := range items {
			if _, ok := accessibleDeptIDs[item.ID]; ok {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	}

	slices.SortFunc(items, func(a, b HomeworkClassOption) int { return strings.Compare(a.Name, b.Name) })
	return items, nil
}

func (s *HomeworkService) getAccessibleClassMap(access AccessContext) (map[string]HomeworkClassOption, error) {
	items, err := s.getAccessibleClasses(access)
	if err != nil {
		return nil, err
	}
	result := make(map[string]HomeworkClassOption, len(items))
	for _, item := range items {
		result[item.ID] = item
	}
	return result, nil
}

func classIDsFromOptions(items []HomeworkClassOption) []string {
	ids := make([]string, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}
	return ids
}

func containsClass(items []HomeworkClassOption, classID string) bool {
	for _, item := range items {
		if item.ID == classID {
			return true
		}
	}
	return false
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func chooseNonEmpty(values ...string) string {
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	return ""
}

func dedupeStrings(items []string) []string {
	seen := make(map[string]struct{}, len(items))
	result := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		result = append(result, item)
	}
	return result
}

func classNameFromOptions(items []HomeworkClassOption, classID string) string {
	for _, item := range items {
		if item.ID == classID {
			return item.Name
		}
	}
	return ""
}

func splitDepartmentPath(path string) (string, string, string) {
	parts := strings.Split(strings.TrimSpace(path), "/")
	cleaned := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			cleaned = append(cleaned, part)
		}
	}
	if len(cleaned) == 0 {
		return "", "", ""
	}
	collegeName := cleaned[0]
	className := cleaned[len(cleaned)-1]
	majorName := ""
	if len(cleaned) >= 2 {
		majorName = cleaned[len(cleaned)-2]
	}
	return collegeName, majorName, className
}

func (s *HomeworkService) getOrCreateTodayTask(today string) (*model.HomeworkTask, error) {
	tasks, err := s.taskRepo.List(nil, today, true)
	if err != nil {
		return nil, fmt.Errorf("读取当天作业记录失败: %w", err)
	}
	if len(tasks) > 0 {
		return &tasks[0], nil
	}

	task := &model.HomeworkTask{
		ID:          newID("hw"),
		Title:       "当天作业",
		Description: "系统自动生成的当天作业记录",
		PublishDate: today,
		CheckDate:   today,
		IsActive:    true,
	}
	if err := s.taskRepo.Create(task); err != nil {
		return nil, fmt.Errorf("创建当天作业记录失败: %w", err)
	}
	return task, nil
}
