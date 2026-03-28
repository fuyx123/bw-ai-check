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

type MenuService struct {
	db       *gorm.DB
	menuRepo *repository.MenuRepository
	logger   *zap.Logger
}

func NewMenuService(db *gorm.DB, menuRepo *repository.MenuRepository, logger *zap.Logger) *MenuService {
	return &MenuService{
		db:       db,
		menuRepo: menuRepo,
		logger:   logger,
	}
}

func (s *MenuService) GetTree() ([]model.Menu, error) {
	menus, err := s.menuRepo.FindAll()
	if err != nil {
		return nil, err
	}
	return buildMenuTree(menus), nil
}

func (s *MenuService) GetUserMenus(access AccessContext) ([]model.Menu, error) {
	var menuIDs []string
	if err := s.db.Table("role_menus").Where("role_id = ?", access.RoleID).Pluck("menu_id", &menuIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to load role menus: %w", err)
	}

	var menus []model.Menu
	if err := s.db.Where("id IN ?", menuIDs).Find(&menus).Error; err != nil {
		return nil, fmt.Errorf("failed to query user menus: %w", err)
	}
	return buildMenuTree(menus), nil
}

func (s *MenuService) Create(access AccessContext, req dto.CreateMenuReq) (*model.Menu, error) {
	menu := model.Menu{
		ID:        newID("menu"),
		Name:      strings.TrimSpace(req.Name),
		Path:      strings.TrimSpace(req.Path),
		Icon:      strings.TrimSpace(req.Icon),
		ParentID:  req.ParentID,
		SortOrder: req.SortOrder,
		Visible:   req.Visible,
		Type:      req.Type,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&menu).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建菜单",
			Operator: access.UserID,
			Target:   menu.ID,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to create menu: %w", err)
	}

	return &menu, nil
}

func (s *MenuService) Update(access AccessContext, id string, req dto.UpdateMenuReq) (*model.Menu, error) {
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Path != nil {
		updates["path"] = strings.TrimSpace(*req.Path)
	}
	if req.Icon != nil {
		updates["icon"] = strings.TrimSpace(*req.Icon)
	}
	if req.ParentID != nil {
		updates["parent_id"] = *req.ParentID
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.Visible != nil {
		updates["visible"] = *req.Visible
	}
	if req.Type != nil {
		updates["type"] = *req.Type
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(updates) > 0 {
			if err := tx.Model(&model.Menu{}).Where("id = ?", id).Updates(updates).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "更新菜单",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update menu: %w", err)
	}

	return s.menuRepo.FindByID(id)
}

func (s *MenuService) Delete(access AccessContext, id string) error {
	menus, err := s.menuRepo.FindAll()
	if err != nil {
		return err
	}

	deleteIDs := collectMenuDeleteOrder(id, menus)
	if len(deleteIDs) == 0 {
		return fmt.Errorf("menu not found")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, menuID := range deleteIDs {
			if err := tx.Where("id = ?", menuID).Delete(&model.Menu{}).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "删除菜单",
			Operator: access.UserID,
			Target:   id,
			Type:     "warning",
		}).Error
	})
}

func buildMenuTree(menus []model.Menu) []model.Menu {
	menuMap := make(map[string]model.Menu)
	for _, menu := range menus {
		menu.Children = nil
		menuMap[menu.ID] = menu
	}

	var buildTree func(*string) []model.Menu
	buildTree = func(parentID *string) []model.Menu {
		result := make([]model.Menu, 0)
		for _, menu := range menus {
			if (parentID == nil && menu.ParentID == nil) ||
				(parentID != nil && menu.ParentID != nil && *parentID == *menu.ParentID) {
				menu.Children = buildTree(&menu.ID)
				result = append(result, menu)
			}
		}
		sortMenuTree(result)
		return result
	}

	return buildTree(nil)
}

func sortMenuTree(nodes []model.Menu) {
	slices.SortFunc(nodes, func(a, b model.Menu) int {
		if a.SortOrder == b.SortOrder {
			return strings.Compare(a.Name, b.Name)
		}
		if a.SortOrder < b.SortOrder {
			return -1
		}
		return 1
	})
	for idx := range nodes {
		if len(nodes[idx].Children) > 0 {
			sortMenuTree(nodes[idx].Children)
		}
	}
}

func collectMenuDeleteOrder(rootID string, menus []model.Menu) []string {
	childrenByParent := make(map[string][]string)
	for _, menu := range menus {
		if menu.ParentID != nil {
			childrenByParent[*menu.ParentID] = append(childrenByParent[*menu.ParentID], menu.ID)
		}
	}

	result := make([]string, 0)
	var walk func(string)
	walk = func(nodeID string) {
		for _, childID := range childrenByParent[nodeID] {
			walk(childID)
		}
		result = append(result, nodeID)
	}

	exists := false
	for _, menu := range menus {
		if menu.ID == rootID {
			exists = true
			break
		}
	}
	if !exists {
		return nil
	}

	walk(rootID)
	return result
}
