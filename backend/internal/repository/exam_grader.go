package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// ExamGraderRepository 阅卷老师分配数据访问层
type ExamGraderRepository struct {
	db *gorm.DB
}

// NewExamGraderRepository 创建阅卷老师仓储
func NewExamGraderRepository(db *gorm.DB) *ExamGraderRepository {
	return &ExamGraderRepository{db: db}
}

// Upsert 为指定考次+班级设置阅卷老师（存在则更新，不存在则创建）
func (r *ExamGraderRepository) Upsert(grader *model.ExamGrader) error {
	var existing model.ExamGrader
	err := r.db.Where("exam_session_id = ? AND class_id = ?", grader.ExamSessionID, grader.ClassID).First(&existing).Error
	if err == gorm.ErrRecordNotFound {
		grader.ID = uuid.NewString()
		return r.db.Create(grader).Error
	}
	if err != nil {
		return err
	}
	// 更新已有记录
	return r.db.Model(&existing).Updates(map[string]interface{}{
		"grader_id":   grader.GraderID,
		"grader_name": grader.GraderName,
	}).Error
}

// Delete 删除指定分配记录
func (r *ExamGraderRepository) Delete(id string) error {
	return r.db.Delete(&model.ExamGrader{}, "id = ?", id).Error
}

// DeleteBySessionAndClass 删除某考次某班级的阅卷老师分配
func (r *ExamGraderRepository) DeleteBySessionAndClass(sessionID, classID string) error {
	return r.db.Delete(&model.ExamGrader{}, "exam_session_id = ? AND class_id = ?", sessionID, classID).Error
}

// ListBySession 查询某考次的所有阅卷老师分配
func (r *ExamGraderRepository) ListBySession(sessionID string) ([]*model.ExamGrader, error) {
	var graders []*model.ExamGrader
	if err := r.db.Where("exam_session_id = ?", sessionID).Find(&graders).Error; err != nil {
		return nil, err
	}
	return graders, nil
}

// FindByGraderAndSession 检查某用户是否为某考次的阅卷老师
func (r *ExamGraderRepository) FindByGraderAndSession(graderID, sessionID string) (*model.ExamGrader, error) {
	var grader model.ExamGrader
	if err := r.db.Where("grader_id = ? AND exam_session_id = ?", graderID, sessionID).First(&grader).Error; err != nil {
		return nil, err
	}
	return &grader, nil
}

// FindSessionIDsByGrader 获取某用户担任阅卷老师的所有考次 ID 列表
func (r *ExamGraderRepository) FindSessionIDsByGrader(graderID string) ([]string, error) {
	var sessionIDs []string
	if err := r.db.Model(&model.ExamGrader{}).
		Where("grader_id = ?", graderID).
		Pluck("exam_session_id", &sessionIDs).Error; err != nil {
		return nil, err
	}
	return sessionIDs, nil
}
