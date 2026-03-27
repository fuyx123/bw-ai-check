package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// RoleRepository 角色数据访问层
type RoleRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewRoleRepository 创建角色仓储实例
func NewRoleRepository(db *gorm.DB, logger *zap.Logger) *RoleRepository {
	return &RoleRepository{
		db:     db,
		logger: logger,
	}
}

// FindAll 查询所有角色
func (r *RoleRepository) FindAll() ([]model.Role, error) {
	var roles []model.Role
	if err := r.db.Find(&roles).Error; err != nil {
		r.logger.Error("Failed to find roles", zap.Error(err))
		return nil, err
	}
	return roles, nil
}

// FindByID 通过 ID 查找角色
func (r *RoleRepository) FindByID(id string) (*model.Role, error) {
	role := &model.Role{}
	if err := r.db.Where("id = ?", id).Preload("Menus").First(role).Error; err != nil {
		return nil, err
	}
	return role, nil
}

// Create 创建角色
func (r *RoleRepository) Create(role *model.Role) error {
	return r.db.Create(role).Error
}

// Update 更新角色
func (r *RoleRepository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&model.Role{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除角色
func (r *RoleRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Role{}).Error
}
