package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// GradeRepository 职级数据访问层
type GradeRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewGradeRepository 创建职级仓储实例
func NewGradeRepository(db *gorm.DB, logger *zap.Logger) *GradeRepository {
	return &GradeRepository{
		db:     db,
		logger: logger,
	}
}

// FindAll 查询所有职级
func (r *GradeRepository) FindAll() ([]model.Grade, error) {
	var grades []model.Grade
	if err := r.db.Find(&grades).Error; err != nil {
		r.logger.Error("Failed to find grades", zap.Error(err))
		return nil, err
	}
	return grades, nil
}

// FindByID 通过 ID 查找职级
func (r *GradeRepository) FindByID(id string) (*model.Grade, error) {
	grade := &model.Grade{}
	if err := r.db.Where("id = ?", id).First(grade).Error; err != nil {
		return nil, err
	}
	return grade, nil
}

// Create 创建职级
func (r *GradeRepository) Create(grade *model.Grade) error {
	return r.db.Create(grade).Error
}

// Update 更新职级
func (r *GradeRepository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&model.Grade{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除职级
func (r *GradeRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Grade{}).Error
}
