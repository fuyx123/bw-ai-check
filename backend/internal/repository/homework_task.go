package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// HomeworkTaskRepository 作业任务仓储
type HomeworkTaskRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewHomeworkTaskRepository(db *gorm.DB, logger *zap.Logger) *HomeworkTaskRepository {
	return &HomeworkTaskRepository{db: db, logger: logger}
}

func (r *HomeworkTaskRepository) Create(task *model.HomeworkTask) error {
	return r.db.Create(task).Error
}

func (r *HomeworkTaskRepository) FindByID(id string) (*model.HomeworkTask, error) {
	var task model.HomeworkTask
	if err := r.db.First(&task, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *HomeworkTaskRepository) ReplaceClasses(homeworkID string, classIDs []string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("homework_id = ?", homeworkID).Delete(&model.HomeworkTaskClass{}).Error; err != nil {
			return err
		}
		if len(classIDs) == 0 {
			return nil
		}
		rows := make([]model.HomeworkTaskClass, 0, len(classIDs))
		for _, classID := range classIDs {
			rows = append(rows, model.HomeworkTaskClass{
				HomeworkID: homeworkID,
				ClassID:    classID,
			})
		}
		return tx.Create(&rows).Error
	})
}

func (r *HomeworkTaskRepository) List(classIDs []string, checkDate string, includeInactive bool) ([]model.HomeworkTask, error) {
	query := r.db.Model(&model.HomeworkTask{}).
		Distinct("homework_tasks.*").
		Joins("LEFT JOIN homework_task_classes ON homework_task_classes.homework_id = homework_tasks.id")

	if len(classIDs) > 0 {
		query = query.Where("homework_task_classes.class_id IN ?", classIDs)
	}
	if checkDate != "" {
		query = query.Where("homework_tasks.check_date = ?", checkDate)
	}
	if !includeInactive {
		query = query.Where("homework_tasks.is_active = ?", true)
	}

	var tasks []model.HomeworkTask
	err := query.
		Order("homework_tasks.check_date DESC, homework_tasks.created_at DESC").
		Find(&tasks).Error
	return tasks, err
}

func (r *HomeworkTaskRepository) LoadClassMeta(taskIDs []string) (map[string][]string, map[string][]string, error) {
	if len(taskIDs) == 0 {
		return map[string][]string{}, map[string][]string{}, nil
	}

	type row struct {
		HomeworkID string `gorm:"column:homework_id"`
		ClassID    string `gorm:"column:class_id"`
		ClassName  string `gorm:"column:class_name"`
	}

	var rows []row
	err := r.db.Table("homework_task_classes").
		Select("homework_task_classes.homework_id, homework_task_classes.class_id, departments.name AS class_name").
		Joins("LEFT JOIN departments ON departments.id = homework_task_classes.class_id").
		Where("homework_task_classes.homework_id IN ?", taskIDs).
		Order("departments.name ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, nil, err
	}

	idMap := make(map[string][]string, len(taskIDs))
	nameMap := make(map[string][]string, len(taskIDs))
	for _, item := range rows {
		idMap[item.HomeworkID] = append(idMap[item.HomeworkID], item.ClassID)
		nameMap[item.HomeworkID] = append(nameMap[item.HomeworkID], item.ClassName)
	}
	return idMap, nameMap, nil
}

func (r *HomeworkTaskRepository) ListClassIDs(homeworkID string) ([]string, error) {
	var ids []string
	err := r.db.Model(&model.HomeworkTaskClass{}).
		Where("homework_id = ?", homeworkID).
		Pluck("class_id", &ids).Error
	return ids, err
}
