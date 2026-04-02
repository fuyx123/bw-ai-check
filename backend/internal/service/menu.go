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
	// 支持多角色：用 user_id 取出用户全部 role_id，再聚合 role_menus。
	var roleIDs []string
	if err := s.db.Table("user_roles").
		Where("user_id = ?", access.UserID).
		Pluck("role_id", &roleIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to load user roles: %w", err)
	}

	if len(roleIDs) == 0 {
		return []model.Menu{}, nil
	}

	var menuIDs []string
	if err := s.db.Table("role_menus").Where("role_id IN ?", roleIDs).Pluck("menu_id", &menuIDs).Error; err != nil {
		return nil, fmt.Errorf("failed to load role menus: %w", err)
	}

	if len(menuIDs) == 0 {
		return []model.Menu{}, nil
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

// MenuTreeBuilder 菜单树构建器
type MenuTreeBuilder struct {
	menus map[string]model.Menu
}

// NewMenuTreeBuilder 创建菜单树构建器
func NewMenuTreeBuilder(menus []model.Menu) *MenuTreeBuilder {
	menuMap := make(map[string]model.Menu)
	for _, menu := range menus {
		menu.Children = nil
		menuMap[menu.ID] = menu
	}
	return &MenuTreeBuilder{menus: menuMap}
}

// Build 构建菜单树（从根节点开始）
func (b *MenuTreeBuilder) Build() []model.Menu {
	roots := b.findChildren(nil)
	b.sort(roots)
	return roots
}

// BuildFromParent 从指定父节点构建菜单树
func (b *MenuTreeBuilder) BuildFromParent(parentID *string) []model.Menu {
	children := b.findChildren(parentID)
	b.sort(children)
	return children
}

// findChildren 递归找出指定父节点的所有直接子菜单
func (b *MenuTreeBuilder) findChildren(parentID *string) []model.Menu {
	result := make([]model.Menu, 0)
	for _, menu := range b.menus {
		if b.isChild(menu, parentID) {
			menu.Children = b.findChildren(&menu.ID)
			result = append(result, menu)
		}
	}
	return result
}

// isChild 判断是否是子菜单
func (b *MenuTreeBuilder) isChild(menu model.Menu, parentID *string) bool {
	if parentID == nil {
		return menu.ParentID == nil
	}
	return menu.ParentID != nil && *menu.ParentID == *parentID
}

// sort 按 SortOrder 和 Name 排序菜单树（含递归）
func (b *MenuTreeBuilder) sort(menus []model.Menu) {
	slices.SortFunc(menus, func(a, b model.Menu) int {
		if a.SortOrder != b.SortOrder {
			if a.SortOrder < b.SortOrder {
				return -1
			}
			return 1
		}
		return strings.Compare(a.Name, b.Name)
	})
	for i := range menus {
		if len(menus[i].Children) > 0 {
			b.sort(menus[i].Children)
		}
	}
}

// CollectDeleteIDs 收集要删除的菜单 ID（包含所有子菜单）
func (b *MenuTreeBuilder) CollectDeleteIDs(rootID string) []string {
	if _, exists := b.menus[rootID]; !exists {
		return nil
	}

	result := make([]string, 0)
	b.collectChildrenIDs(rootID, &result)
	result = append(result, rootID)
	return result
}

// collectChildrenIDs 递归收集所有子菜单 ID
func (b *MenuTreeBuilder) collectChildrenIDs(nodeID string, result *[]string) {
	for _, menu := range b.menus {
		if menu.ParentID != nil && *menu.ParentID == nodeID {
			b.collectChildrenIDs(menu.ID, result)
			*result = append(*result, menu.ID)
		}
	}
}

// buildMenuTree 构建菜单树（兼容现有接口）
func buildMenuTree(menus []model.Menu) []model.Menu {
	return NewMenuTreeBuilder(menus).Build()
}

// collectMenuDeleteOrder 收集删除顺序（兼容现有接口）
func collectMenuDeleteOrder(rootID string, menus []model.Menu) []string {
	return NewMenuTreeBuilder(menus).CollectDeleteIDs(rootID)
}
