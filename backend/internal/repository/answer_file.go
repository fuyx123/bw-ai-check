package repository

import (
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// AnswerFileRepository 答题文件数据访问层
type AnswerFileRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAnswerFileRepository 创建答题文件仓储
func NewAnswerFileRepository(db *gorm.DB, logger *zap.Logger) *AnswerFileRepository {
	return &AnswerFileRepository{db: db, logger: logger}
}

// Create 创建文件记录
func (r *AnswerFileRepository) Create(file *model.AnswerFile) error {
	return r.db.Create(file).Error
}

// BatchCreate 批量创建文件记录
func (r *AnswerFileRepository) BatchCreate(files []*model.AnswerFile) error {
	if len(files) == 0 {
		return nil
	}
	return r.db.Create(&files).Error
}

// FindByID 按 ID 查询
func (r *AnswerFileRepository) FindByID(id string) (*model.AnswerFile, error) {
	var file model.AnswerFile
	if err := r.db.Where("id = ?", id).First(&file).Error; err != nil {
		return nil, err
	}
	return &file, nil
}

// ListFilter 列表筛选条件
type ListFilter struct {
	UploaderID    string
	ClassID       string
	ClassIDs      []string // IN 查询（college/major 级别权限使用）
	ExamSessionID string
	CycleID       string // 按教学周期过滤，JOIN exam_sessions

	// 权限控制：当班老师对周考/月考的访问限制
	RestrictWeeklyMonthly bool     // true 时对周考/月考只显示 reviewed 的文件
	GrantedSessionIDs     []string // 豁免 session（当前用户是已分配阅卷老师的考次）
}

// List 分页查询文件列表
func (r *AnswerFileRepository) List(filter ListFilter, page, pageSize int) ([]*model.AnswerFile, int64, error) {
	query := r.db.Model(&model.AnswerFile{})

	// 需要 JOIN exam_sessions 的情况
	needSessionJoin := filter.CycleID != "" || filter.RestrictWeeklyMonthly
	if needSessionJoin {
		query = query.Joins("JOIN exam_sessions ON exam_sessions.id = answer_files.exam_session_id")
	}

	if filter.CycleID != "" {
		query = query.Where("exam_sessions.cycle_id = ?", filter.CycleID)
	}

	// 当班老师限制：周考/月考只能看 reviewed 的，除非是指定阅卷老师的考次
	if filter.RestrictWeeklyMonthly {
		if len(filter.GrantedSessionIDs) > 0 {
			query = query.Where(
				"(exam_sessions.type NOT IN ? OR answer_files.status = ? OR answer_files.exam_session_id IN ?)",
				[]string{"weekly", "monthly"}, "reviewed", filter.GrantedSessionIDs,
			)
		} else {
			query = query.Where(
				"(exam_sessions.type NOT IN ? OR answer_files.status = ?)",
				[]string{"weekly", "monthly"}, "reviewed",
			)
		}
	}

	if filter.UploaderID != "" {
		query = query.Where("answer_files.uploader_id = ?", filter.UploaderID)
	}
	if filter.ClassID != "" {
		query = query.Where("answer_files.class_id = ?", filter.ClassID)
	} else if len(filter.ClassIDs) > 0 {
		query = query.Where("answer_files.class_id IN ?", filter.ClassIDs)
	}
	if filter.ExamSessionID != "" {
		query = query.Where("answer_files.exam_session_id = ?", filter.ExamSessionID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var files []*model.AnswerFile
	offset := (page - 1) * pageSize
	if err := query.Order("answer_files.created_at DESC").Offset(offset).Limit(pageSize).Find(&files).Error; err != nil {
		return nil, 0, err
	}

	return files, total, nil
}

// UpdateStatus 更新文件状态
func (r *AnswerFileRepository) UpdateStatus(id, status string) error {
	return r.db.Model(&model.AnswerFile{}).Where("id = ?", id).Update("status", status).Error
}

// UpdateAIResult 将 AI 阅卷结果写回记录，状态更新为 graded
func (r *AnswerFileRepository) UpdateAIResult(id, aiDetail string, aiScore int, aiComment string) error {
	return r.db.Model(&model.AnswerFile{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"ai_detail":  aiDetail,
			"ai_score":   aiScore,
			"ai_comment": aiComment,
			"status":     "graded",
		}).Error
}

// SaveAIGradingFailure 自动阅卷失败时写入说明，便于前端展示（避免长期停留在「待阅卷」）
func (r *AnswerFileRepository) SaveAIGradingFailure(id, comment string) error {
	if len(comment) > 2000 {
		comment = comment[:2000] + "…"
	}
	return r.db.Model(&model.AnswerFile{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"ai_comment": comment,
			"ai_score":   0,
			"status":     "failed",
		}).Error
}

// SaveManualReview 保存人工复阅结果，状态更新为 reviewed
// detail 为逐题评分 JSON 字符串（格式：[{"no":1,"score":5},...]）
func (r *AnswerFileRepository) SaveManualReview(id, graderID, comment string, score int, detail string) error {
	now := time.Now()
	return r.db.Model(&model.AnswerFile{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"manual_score":   score,
			"manual_comment": comment,
			"manual_detail":  detail,
			"grader_id":      graderID,
			"graded_at":      now,
			"status":         "reviewed",
		}).Error
}

// Delete 删除文件记录
func (r *AnswerFileRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.AnswerFile{}).Error
}
