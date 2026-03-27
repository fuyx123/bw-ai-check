package service

import (
	"fmt"
	"slices"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
)

type RoleService struct {
	db       *gorm.DB
	roleRepo *repository.RoleRepository
	logger   *zap.Logger
}

func NewRoleService(db *gorm.DB, roleRepo *repository.RoleRepository, logger *zap.Logger) *RoleService {
	return &RoleService{
		db:       db,
		roleRepo: roleRepo,
		logger:   logger,
	}
}

func (s *RoleService) List() ([]model.Role, error) {
	roles, err := s.roleRepo.FindAll()
	if err != nil {
		return nil, err
	}

	var roleMenus []model.RoleMenu
	if err := s.db.Find(&roleMenus).Error; err != nil {
		return nil, fmt.Errorf("failed to load role permissions: %w", err)
	}
	permissionsByRole := make(map[string][]string)
	for _, roleMenu := range roleMenus {
		permissionsByRole[roleMenu.RoleID] = append(permissionsByRole[roleMenu.RoleID], roleMenu.MenuID)
	}

	type roleCount struct {
		RoleID string
		Count  int
	}
	var roleCounts []roleCount
	if err := s.db.Table("user_roles").
		Select("role_id, COUNT(*) AS count").
		Group("role_id").
		Scan(&roleCounts).Error; err != nil {
		return nil, fmt.Errorf("failed to count role users: %w", err)
	}
	countByRole := make(map[string]int)
	for _, item := range roleCounts {
		countByRole[item.RoleID] = item.Count
	}

	for idx := range roles {
		roles[idx].Permissions = permissionsByRole[roles[idx].ID]
		slices.Sort(roles[idx].Permissions)
		roles[idx].UserCount = countByRole[roles[idx].ID]
	}

	slices.SortFunc(roles, func(a, b model.Role) int {
		if a.Name == b.Name {
			return strings.Compare(a.ID, b.ID)
		}
		return strings.Compare(a.Name, b.Name)
	})
	return roles, nil
}

func (s *RoleService) GetWithMenus(id string) (*model.Role, error) {
	role, err := s.roleRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	role.Permissions = make([]string, 0, len(role.Menus))
	for _, menu := range role.Menus {
		role.Permissions = append(role.Permissions, menu.ID)
	}
	slices.Sort(role.Permissions)

	var userCount int64
	if err := s.db.Table("user_roles").Where("role_id = ?", id).Count(&userCount).Error; err != nil {
		return nil, fmt.Errorf("failed to count role users: %w", err)
	}
	role.UserCount = int(userCount)
	return role, nil
}

func (s *RoleService) Create(access AccessContext, req dto.CreateRoleReq) (*model.Role, error) {
	var existingCount int64
	if err := s.db.Model(&model.Role{}).Where("name = ?", req.Name).Count(&existingCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate role uniqueness: %w", err)
	}
	if existingCount > 0 {
		return nil, fmt.Errorf("role name already exists")
	}

	role := model.Role{
		ID:          newID("role"),
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
		DataScope:   req.DataScope,
		UserCount:   0,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&role).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.RoleMenu{RoleID: role.ID, MenuID: "menu-dashboard"}).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建角色",
			Operator: access.UserID,
			Target:   role.ID,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	return s.GetWithMenus(role.ID)
}

func (s *RoleService) Update(access AccessContext, id string, req dto.UpdateRoleReq) (*model.Role, error) {
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.DataScope != nil {
		updates["data_scope"] = *req.DataScope
	}

	if len(updates) == 0 {
		return s.GetWithMenus(id)
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.Role{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "更新角色",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	return s.GetWithMenus(id)
}

func (s *RoleService) UpdateMenus(access AccessContext, id string, menuIDs []string) (*model.Role, error) {
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("role_id = ?", id).Delete(&model.RoleMenu{}).Error; err != nil {
			return err
		}
		for _, menuID := range menuIDs {
			if err := tx.Create(&model.RoleMenu{RoleID: id, MenuID: menuID}).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "修改角色权限",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update role permissions: %w", err)
	}

	return s.GetWithMenus(id)
}

func (s *RoleService) Delete(access AccessContext, id string) error {
	var userCount int64
	if err := s.db.Table("user_roles").Where("role_id = ?", id).Count(&userCount).Error; err != nil {
		return fmt.Errorf("failed to validate role references: %w", err)
	}
	if userCount > 0 {
		return fmt.Errorf("role still has %d bound users", userCount)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("role_id = ?", id).Delete(&model.RoleMenu{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", id).Delete(&model.Role{}).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "删除角色",
			Operator: access.UserID,
			Target:   id,
			Type:     "warning",
		}).Error
	})
}
