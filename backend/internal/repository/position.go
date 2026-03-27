package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// PositionRepository 岗位数据访问层
type PositionRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPositionRepository 创建岗位仓储实例
func NewPositionRepository(db *gorm.DB, logger *zap.Logger) *PositionRepository {
	return &PositionRepository{
		db:     db,
		logger: logger,
	}
}

// FindAll 查询所有岗位
func (r *PositionRepository) FindAll() ([]model.Position, error) {
	var positions []model.Position
	if err := r.db.Find(&positions).Error; err != nil {
		r.logger.Error("Failed to find positions", zap.Error(err))
		return nil, err
	}
	return positions, nil
}

// FindByID 通过 ID 查找岗位
func (r *PositionRepository) FindByID(id string) (*model.Position, error) {
	position := &model.Position{}
	if err := r.db.Where("id = ?", id).First(position).Error; err != nil {
		return nil, err
	}
	return position, nil
}

// Create 创建岗位
func (r *PositionRepository) Create(position *model.Position) error {
	return r.db.Create(position).Error
}

// Update 更新岗位
func (r *PositionRepository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&model.Position{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除岗位
func (r *PositionRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Position{}).Error
}
