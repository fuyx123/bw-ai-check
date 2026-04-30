package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// HomeworkSubmissionRepository 作业提交仓储
type HomeworkSubmissionRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewHomeworkSubmissionRepository(db *gorm.DB, logger *zap.Logger) *HomeworkSubmissionRepository {
	return &HomeworkSubmissionRepository{db: db, logger: logger}
}

func (r *HomeworkSubmissionRepository) Create(submission *model.HomeworkSubmission) error {
	return r.db.Create(submission).Error
}

func (r *HomeworkSubmissionRepository) Save(submission *model.HomeworkSubmission) error {
	return r.db.Save(submission).Error
}

func (r *HomeworkSubmissionRepository) FindByHomeworkAndStudent(homeworkID, studentID string) (*model.HomeworkSubmission, error) {
	var submission model.HomeworkSubmission
	err := r.db.Where("homework_id = ? AND student_id = ?", homeworkID, studentID).
		First(&submission).Error
	if err != nil {
		return nil, err
	}
	return &submission, nil
}

func (r *HomeworkSubmissionRepository) FindByID(id string) (*model.HomeworkSubmission, error) {
	type row struct {
		model.HomeworkSubmission
		HomeworkTitle string `gorm:"column:homework_title"`
	}
	var result row
	tx := r.db.Table("homework_submissions").
		Select("homework_submissions.*, homework_tasks.title AS homework_title").
		Joins("LEFT JOIN homework_tasks ON homework_tasks.id = homework_submissions.homework_id").
		Where("homework_submissions.id = ?", id).
		Limit(1).
		Scan(&result)
	if tx.Error != nil {
		return nil, tx.Error
	}
	if tx.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	submission := result.HomeworkSubmission
	submission.HomeworkTitle = result.HomeworkTitle
	return &submission, nil
}

type HomeworkSubmissionListFilter struct {
	HomeworkID    string
	ClassID       string
	StudentID     string
	ClassIDs      []string
	Statuses      []string
	SubmittedDate string
	Page          int
	PageSize      int
}

func (r *HomeworkSubmissionRepository) List(filter HomeworkSubmissionListFilter) ([]model.HomeworkSubmission, int64, error) {
	type row struct {
		model.HomeworkSubmission
		HomeworkTitle string `gorm:"column:homework_title"`
	}
	query := r.db.Table("homework_submissions").
		Select("homework_submissions.*, homework_tasks.title AS homework_title").
		Joins("LEFT JOIN homework_tasks ON homework_tasks.id = homework_submissions.homework_id")

	if filter.HomeworkID != "" {
		query = query.Where("homework_submissions.homework_id = ?", filter.HomeworkID)
	}
	if filter.StudentID != "" {
		query = query.Where("homework_submissions.student_id = ?", filter.StudentID)
	}
	if filter.ClassID != "" {
		query = query.Where("homework_submissions.class_id = ?", filter.ClassID)
	} else if len(filter.ClassIDs) > 0 {
		query = query.Where("homework_submissions.class_id IN ?", filter.ClassIDs)
	}
	if len(filter.Statuses) > 0 {
		query = query.Where("homework_submissions.review_status IN ?", filter.Statuses)
	}
	if filter.SubmittedDate != "" {
		query = query.Where("DATE(homework_submissions.submitted_at) = ?", filter.SubmittedDate)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []row
	err := query.
		Order("homework_submissions.submitted_at DESC").
		Offset((filter.Page - 1) * filter.PageSize).
		Limit(filter.PageSize).
		Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	items := make([]model.HomeworkSubmission, 0, len(rows))
	for _, item := range rows {
		submission := item.HomeworkSubmission
		submission.HomeworkTitle = item.HomeworkTitle
		items = append(items, submission)
	}
	return items, total, nil
}

func (r *HomeworkSubmissionRepository) ListSubmittedStudentIDs(homeworkIDs []string, classIDs []string) (map[string]map[string]struct{}, error) {
	result := make(map[string]map[string]struct{})
	if len(homeworkIDs) == 0 || len(classIDs) == 0 {
		return result, nil
	}

	type row struct {
		HomeworkID string `gorm:"column:homework_id"`
		StudentID  string `gorm:"column:student_id"`
	}
	var rows []row
	err := r.db.Table("homework_submissions").
		Select("homework_id, student_id").
		Where("homework_id IN ?", homeworkIDs).
		Where("class_id IN ?", classIDs).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for _, item := range rows {
		if _, ok := result[item.HomeworkID]; !ok {
			result[item.HomeworkID] = make(map[string]struct{})
		}
		result[item.HomeworkID][item.StudentID] = struct{}{}
	}
	return result, nil
}
