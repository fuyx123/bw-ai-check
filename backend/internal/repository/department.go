package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// DepartmentRepository 部门数据访问层
type DepartmentRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewDepartmentRepository 创建部门仓储实例
func NewDepartmentRepository(db *gorm.DB, logger *zap.Logger) *DepartmentRepository {
	return &DepartmentRepository{
		db:     db,
		logger: logger,
	}
}

// FindAll 查询所有部门
func (r *DepartmentRepository) FindAll() ([]model.Department, error) {
	var depts []model.Department
	if err := r.db.Find(&depts).Error; err != nil {
		r.logger.Error("Failed to find departments", zap.Error(err))
		return nil, err
	}
	return depts, nil
}

// FindByID 通过 ID 查找部门
func (r *DepartmentRepository) FindByID(id string) (*model.Department, error) {
	dept := &model.Department{}
	if err := r.db.Where("id = ?", id).First(dept).Error; err != nil {
		return nil, err
	}
	return dept, nil
}

// Create 创建部门
func (r *DepartmentRepository) Create(dept *model.Department) error {
	return r.db.Create(dept).Error
}

// Update 更新部门
func (r *DepartmentRepository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&model.Department{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除部门
func (r *DepartmentRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Department{}).Error
}
