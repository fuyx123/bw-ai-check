package repository

import (
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// UserRepository 用户数据访问层
type UserRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewUserRepository 创建用户仓储实例
func NewUserRepository(db *gorm.DB, logger *zap.Logger) *UserRepository {
	return &UserRepository{
		db:     db,
		logger: logger,
	}
}

// FindByLoginID 通过登录 ID 查找用户
func (r *UserRepository) FindByLoginID(loginID, userType string) (*model.User, error) {
	identifier := strings.TrimSpace(loginID)
	user := &model.User{}
	err := r.db.Where("user_type = ? AND (login_id = ? OR email = ?)", userType, identifier, identifier).
		Preload("Roles").
		First(user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		r.logger.Error("Failed to find user by login identifier", zap.String("loginID", identifier), zap.Error(err))
		return nil, fmt.Errorf("database error: %w", err)
	}
	return user, nil
}

// FindByID 通过 ID 查找用户
func (r *UserRepository) FindByID(id string) (*model.User, error) {
	user := &model.User{}
	err := r.db.Where("id = ?", id).
		Preload("Roles").
		First(user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		r.logger.Error("Failed to find user by id", zap.String("id", id), zap.Error(err))
		return nil, fmt.Errorf("database error: %w", err)
	}
	return user, nil
}

// FindAll 查询所有用户（分页）
func (r *UserRepository) FindAll(page, pageSize int) ([]model.User, int64, error) {
	var users []model.User
	var total int64

	// 统计总数
	if err := r.db.Model(&model.User{}).Count(&total).Error; err != nil {
		r.logger.Error("Failed to count users", zap.Error(err))
		return nil, 0, fmt.Errorf("database error: %w", err)
	}

	// 查询分页数据
	offset := (page - 1) * pageSize
	if err := r.db.Offset(offset).Limit(pageSize).
		Preload("Roles").
		Find(&users).Error; err != nil {
		r.logger.Error("Failed to find users", zap.Error(err))
		return nil, 0, fmt.Errorf("database error: %w", err)
	}

	return users, total, nil
}

// Create 创建用户
func (r *UserRepository) Create(user *model.User, roleIDs []string) error {
	// 创建用户
	if err := r.db.Create(user).Error; err != nil {
		r.logger.Error("Failed to create user", zap.String("loginID", user.LoginID), zap.Error(err))
		return fmt.Errorf("failed to create user: %w", err)
	}

	// 关联角色
	if len(roleIDs) > 0 {
		for _, roleID := range roleIDs {
			if err := r.db.Create(&model.UserRole{
				UserID: user.ID,
				RoleID: roleID,
			}).Error; err != nil {
				r.logger.Error("Failed to assign role to user", zap.String("userID", user.ID), zap.String("roleID", roleID), zap.Error(err))
				return fmt.Errorf("failed to assign role: %w", err)
			}
		}
	}

	return nil
}

// Update 更新用户
func (r *UserRepository) Update(id string, updates map[string]interface{}) error {
	if err := r.db.Model(&model.User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		r.logger.Error("Failed to update user", zap.String("id", id), zap.Error(err))
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

// Delete 删除用户（软删除）
func (r *UserRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&model.User{}).Error; err != nil {
		r.logger.Error("Failed to delete user", zap.String("id", id), zap.Error(err))
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

// AssignRoles 为用户分配角色
func (r *UserRepository) AssignRoles(userID string, roleIDs []string) error {
	// 删除现有角色
	if err := r.db.Where("user_id = ?", userID).Delete(&model.UserRole{}).Error; err != nil {
		r.logger.Error("Failed to delete user roles", zap.String("userID", userID), zap.Error(err))
		return fmt.Errorf("failed to delete user roles: %w", err)
	}

	// 添加新角色
	for _, roleID := range roleIDs {
		if err := r.db.Create(&model.UserRole{
			UserID: userID,
			RoleID: roleID,
		}).Error; err != nil {
			r.logger.Error("Failed to assign role", zap.String("userID", userID), zap.String("roleID", roleID), zap.Error(err))
			return fmt.Errorf("failed to assign role: %w", err)
		}
	}

	return nil
}
