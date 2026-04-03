package service

import (
	"errors"
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
	"bw-ai-check/backend/pkg/crypto"
)

type UserService struct {
	db       *gorm.DB
	userRepo *repository.UserRepository
	logger   *zap.Logger
}

func NewUserService(db *gorm.DB, userRepo *repository.UserRepository, logger *zap.Logger) *UserService {
	return &UserService{
		db:       db,
		userRepo: userRepo,
		logger:   logger,
	}
}

func (s *UserService) List(access AccessContext, filter dto.UserFilter, page, pageSize int) ([]model.User, int64, int64, error) {
	page, pageSize = normalizePage(page, pageSize)

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}

	query := s.db.Model(&model.User{}).
		Joins("LEFT JOIN departments ON departments.id = users.department_id")

	if filter.Keyword != "" {
		keyword := "%" + strings.TrimSpace(filter.Keyword) + "%"
		query = query.Where("users.name LIKE ? OR users.email LIKE ? OR users.login_id LIKE ?", keyword, keyword, keyword)
	}
	if filter.UserType != "" {
		query = query.Where("users.user_type = ?", filter.UserType)
	}
	if filter.DepartmentID != "" {
		query = query.Where("users.department_id = ?", filter.DepartmentID)
	}
	if filter.RoleID != "" {
		query = query.Joins("JOIN user_roles ur ON ur.user_id = users.id AND ur.role_id = ?", filter.RoleID)
	}
	if accessibleDeptIDs != nil {
		query = query.Where("users.department_id IN ?", idsFromSet(accessibleDeptIDs))
	}

	var total int64
	if err := query.Session(&gorm.Session{}).Distinct("users.id").Count(&total).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("failed to count users: %w", err)
	}

	var totalActive int64
	if err := query.Session(&gorm.Session{}).
		Where("users.access_status <> ?", "inactive").
		Distinct("users.id").
		Count(&totalActive).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("failed to count active users: %w", err)
	}

	var users []model.User
	if err := query.Session(&gorm.Session{}).
		Select("DISTINCT users.*, departments.name AS department_name").
		Preload("Roles").
		Order("users.created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&users).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("failed to query users: %w", err)
	}

	applyUserRuntimeFields(users)
	return users, total, totalActive, nil
}

func (s *UserService) GetDetail(access AccessContext, id string) (*model.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, user.DepartmentID) {
		return nil, fmt.Errorf("user is outside current data scope")
	}

	if err := s.db.Table("departments").Select("name").Where("id = ?", user.DepartmentID).Scan(&user.DepartmentName).Error; err != nil {
		return nil, fmt.Errorf("failed to load department info: %w", err)
	}
	applyUserRuntimeField(user)
	return user, nil
}

func (s *UserService) Create(access AccessContext, req dto.CreateUserReq) (*model.User, error) {
	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, req.DepartmentID) {
		return nil, fmt.Errorf("target department is outside current data scope")
	}

	var existingCount int64
	if err := s.db.Model(&model.User{}).
		Where("email = ? OR login_id = ?", req.Email, req.LoginID).
		Count(&existingCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate user uniqueness: %w", err)
	}
	if existingCount > 0 {
		return nil, fmt.Errorf("email or login id already exists")
	}

	passwordHash, err := crypto.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := model.User{
		ID:           newID("user"),
		Name:         strings.TrimSpace(req.Name),
		Email:        strings.TrimSpace(req.Email),
		LoginID:      strings.TrimSpace(req.LoginID),
		PasswordHash: passwordHash,
		Avatar:       req.Avatar,
		Initials:     buildInitials(req.Name),
		UserType:     req.UserType,
		DepartmentID: req.DepartmentID,
		AccessStatus: req.AccessStatus,
		IsActive:     req.IsActive,
		Grade:        req.Grade,
		ClassName:    req.ClassName,
		ClassID:      req.ClassID,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		for _, roleID := range req.RoleIds {
			if err := tx.Create(&model.UserRole{UserID: user.ID, RoleID: roleID}).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建用户",
			Operator: access.UserID,
			Target:   user.ID,
			Type:     "success",
		}).Error
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return s.GetDetail(access, user.ID)
}

func (s *UserService) Update(access AccessContext, id string, req dto.UpdateUserReq) (*model.User, error) {
	existing, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	targetDeptID := existing.DepartmentID
	if req.DepartmentID != nil {
		targetDeptID = *req.DepartmentID
	}
	if !departmentAccessible(accessibleDeptIDs, targetDeptID) {
		return nil, fmt.Errorf("target department is outside current data scope")
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
		updates["initials"] = buildInitials(*req.Name)
	}
	if req.Email != nil {
		updates["email"] = strings.TrimSpace(*req.Email)
	}
	if req.DepartmentID != nil {
		updates["department_id"] = *req.DepartmentID
	}
	if req.AccessStatus != nil {
		updates["access_status"] = *req.AccessStatus
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Avatar != nil {
		updates["avatar"] = *req.Avatar
	}
	if req.Grade != nil {
		updates["grade"] = *req.Grade
	}
	if req.ClassName != nil {
		updates["class_name"] = *req.ClassName
	}
	if req.ClassID != nil {
		updates["class_id"] = *req.ClassID
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if len(updates) > 0 {
			if err := tx.Model(&model.User{}).Where("id = ?", id).Updates(updates).Error; err != nil {
				return err
			}
		}
		if req.RoleIds != nil {
			if err := tx.Where("user_id = ?", id).Delete(&model.UserRole{}).Error; err != nil {
				return err
			}
			for _, roleID := range *req.RoleIds {
				if err := tx.Create(&model.UserRole{UserID: id, RoleID: roleID}).Error; err != nil {
					return err
				}
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "更新用户",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return s.GetDetail(access, id)
}

// ResetPassword 重置用户密码
func (s *UserService) ResetPassword(access AccessContext, id string, newPassword string) error {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, user.DepartmentID) {
		return fmt.Errorf("user is outside current data scope")
	}

	passwordHash, err := crypto.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.User{}).Where("id = ?", id).Update("password_hash", passwordHash).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "重置密码",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	})
}

func (s *UserService) Delete(access AccessContext, id string) error {
	if access.UserID == id {
		return errors.New("cannot delete current login user")
	}

	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, user.DepartmentID) {
		return fmt.Errorf("user is outside current data scope")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", id).Delete(&model.UserRole{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ?", id).Delete(&model.UserPosition{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", id).Delete(&model.User{}).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "删除用户",
			Operator: access.UserID,
			Target:   id,
			Type:     "warning",
		}).Error
	})
}

func (s *UserService) ToggleStatus(access AccessContext, id string, isActive bool) (*model.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, user.DepartmentID) {
		return nil, fmt.Errorf("user is outside current data scope")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.User{}).Where("id = ?", id).Update("is_active", isActive).Error; err != nil {
			return err
		}
		action := "禁用用户"
		logType := "warning"
		if isActive {
			action = "启用用户"
			logType = "success"
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   action,
			Operator: access.UserID,
			Target:   id,
			Type:     logType,
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update user status: %w", err)
	}

	return s.GetDetail(access, id)
}
