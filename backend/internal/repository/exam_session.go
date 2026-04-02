package repository

import (
	"bw-ai-check/backend/internal/model"

	"gorm.io/gorm"
)

// ExamSessionRepository 考次数据访问
type ExamSessionRepository struct {
	db *gorm.DB
}

func NewExamSessionRepository(db *gorm.DB) *ExamSessionRepository {
	return &ExamSessionRepository{db: db}
}

func (r *ExamSessionRepository) BatchCreate(sessions []*model.ExamSession) error {
	return r.db.Create(&sessions).Error
}

func (r *ExamSessionRepository) FindByID(id string) (*model.ExamSession, error) {
	var s model.ExamSession
	if err := r.db.First(&s, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

// ListByCycle 查询某周期下所有考次，按 sort_order + exam_date 排序
func (r *ExamSessionRepository) ListByCycle(cycleID string) ([]*model.ExamSession, error) {
	var sessions []*model.ExamSession
	err := r.db.Where("cycle_id = ?", cycleID).
		Order("sort_order ASC, exam_date ASC").
		Find(&sessions).Error
	return sessions, err
}

// DeleteByCycle 清空某周期下所有考次（重新导入时使用）
func (r *ExamSessionRepository) DeleteByCycle(cycleID string) error {
	return r.db.Delete(&model.ExamSession{}, "cycle_id = ?", cycleID).Error
}

// SessionCountFilter 考次提交统计的数据范围过滤
type SessionCountFilter struct {
	ClassID  string   // 精确匹配单个班级
	ClassIDs []string // IN 查询（college/major 级别）
}

// CountSubmitsByCycle 统计每个考次的已提交人数，返回 map[sessionID]count
func (r *ExamSessionRepository) CountSubmitsByCycle(cycleID string, filter SessionCountFilter) (map[string]int64, error) {
	type row struct {
		ExamSessionID string
		Count         int64
	}
	q := r.db.Table("answer_files").
		Select("exam_session_id, count(*) as count").
		Joins("JOIN exam_sessions ON exam_sessions.id = answer_files.exam_session_id").
		Where("exam_sessions.cycle_id = ?", cycleID)

	if filter.ClassID != "" {
		q = q.Where("answer_files.class_id = ?", filter.ClassID)
	} else if len(filter.ClassIDs) > 0 {
		q = q.Where("answer_files.class_id IN ?", filter.ClassIDs)
	}

	var rows []row
	if err := q.Group("exam_session_id").Scan(&rows).Error; err != nil {
		return nil, err
	}
	result := make(map[string]int64, len(rows))
	for _, r := range rows {
		result[r.ExamSessionID] = r.Count
	}
	return result, nil
}
