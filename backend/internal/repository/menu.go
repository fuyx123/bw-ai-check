package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// MenuRepository 菜单数据访问层
type MenuRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewMenuRepository 创建菜单仓储实例
func NewMenuRepository(db *gorm.DB, logger *zap.Logger) *MenuRepository {
	return &MenuRepository{
		db:     db,
		logger: logger,
	}
}

// FindAll 查询所有菜单
func (r *MenuRepository) FindAll() ([]model.Menu, error) {
	var menus []model.Menu
	if err := r.db.Find(&menus).Error; err != nil {
		r.logger.Error("Failed to find menus", zap.Error(err))
		return nil, err
	}
	return menus, nil
}

// FindByID 通过 ID 查找菜单
func (r *MenuRepository) FindByID(id string) (*model.Menu, error) {
	menu := &model.Menu{}
	if err := r.db.Where("id = ?", id).First(menu).Error; err != nil {
		return nil, err
	}
	return menu, nil
}

// Create 创建菜单
func (r *MenuRepository) Create(menu *model.Menu) error {
	return r.db.Create(menu).Error
}

// Update 更新菜单
func (r *MenuRepository) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&model.Menu{}).Where("id = ?", id).Updates(updates).Error
}

// Delete 删除菜单
func (r *MenuRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&model.Menu{}).Error
}
