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

type DepartmentService struct {
	db       *gorm.DB
	deptRepo *repository.DepartmentRepository
	logger   *zap.Logger
}

func NewDepartmentService(db *gorm.DB, deptRepo *repository.DepartmentRepository, logger *zap.Logger) *DepartmentService {
	return &DepartmentService{
		db:       db,
		deptRepo: deptRepo,
		logger:   logger,
	}
}

func (s *DepartmentService) GetTree(access AccessContext) ([]model.Department, error) {
	depts, err := s.deptRepo.FindAll()
	if err != nil {
		return nil, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if accessibleDeptIDs != nil {
		filtered := make([]model.Department, 0, len(depts))
		for _, dept := range depts {
			if departmentAccessible(accessibleDeptIDs, dept.ID) {
				filtered = append(filtered, dept)
			}
		}
		depts = filtered
	}

	return buildDepartmentTree(depts), nil
}

func (s *DepartmentService) List(access AccessContext, page, pageSize int, level, keyword string) ([]model.Department, int64, error) {
	page, pageSize = normalizePage(page, pageSize)

	depts, err := s.deptRepo.FindAll()
	if err != nil {
		return nil, 0, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}

	filtered := make([]model.Department, 0, len(depts))
	for _, dept := range depts {
		if accessibleDeptIDs != nil && !departmentAccessible(accessibleDeptIDs, dept.ID) {
			continue
		}
		if level != "" && dept.Level != level {
			continue
		}
		if !containsKeyword([]string{dept.Name, dept.Code, dept.LeaderName, dept.LeaderTitle}, keyword) {
			continue
		}
		applyDepartmentRuntimeFields(&dept)
		filtered = append(filtered, dept)
	}

	slices.SortFunc(filtered, func(a, b model.Department) int {
		if a.Name == b.Name {
			return strings.Compare(a.Code, b.Code)
		}
		return strings.Compare(a.Name, b.Name)
	})

	total := int64(len(filtered))
	start := (page - 1) * pageSize
	if start >= len(filtered) {
		return []model.Department{}, total, nil
	}
	end := start + pageSize
	if end > len(filtered) {
		end = len(filtered)
	}

	return filtered[start:end], total, nil
}

func (s *DepartmentService) GetDetail(access AccessContext, id string) (*model.Department, error) {
	dept, err := s.deptRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, dept.ID) {
		return nil, fmt.Errorf("department is outside current data scope")
	}

	applyDepartmentRuntimeFields(dept)
	return dept, nil
}

func (s *DepartmentService) Create(access AccessContext, req dto.CreateDeptReq) (*model.Department, error) {
	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if req.ParentID != nil && !departmentAccessible(accessibleDeptIDs, *req.ParentID) {
		return nil, fmt.Errorf("parent department is outside current data scope")
	}

	var existingCount int64
	if err := s.db.Model(&model.Department{}).Where("code = ?", req.Code).Count(&existingCount).Error; err != nil {
		return nil, fmt.Errorf("failed to validate department code: %w", err)
	}
	if existingCount > 0 {
		return nil, fmt.Errorf("department code already exists")
	}

	dept := model.Department{
		ID:           newID("dept"),
		Name:         strings.TrimSpace(req.Name),
		Code:         strings.ToUpper(strings.TrimSpace(req.Code)),
		ParentID:     req.ParentID,
		Level:        req.Level,
		LeaderName:   strings.TrimSpace(req.LeaderName),
		LeaderTitle:  strings.TrimSpace(req.LeaderTitle),
		LeaderAvatar: req.LeaderAvatar,
		StaffCount:   req.StaffCount,
		Status:       "operational",
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&dept).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建部门",
			Operator: access.UserID,
			Target:   dept.ID,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to create department: %w", err)
	}

	applyDepartmentRuntimeFields(&dept)
	return &dept, nil
}

func (s *DepartmentService) Update(access AccessContext, id string, req dto.UpdateDeptReq) (*model.Department, error) {
	dept, err := s.deptRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, dept.ID) {
		return nil, fmt.Errorf("department is outside current data scope")
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Code != nil {
		updates["code"] = strings.ToUpper(strings.TrimSpace(*req.Code))
	}
	if req.Level != nil {
		updates["level"] = *req.Level
	}
	if req.LeaderName != nil {
		updates["leader_name"] = strings.TrimSpace(*req.LeaderName)
	}
	if req.LeaderTitle != nil {
		updates["leader_title"] = strings.TrimSpace(*req.LeaderTitle)
	}
	if req.LeaderAvatar != nil {
		updates["leader_avatar"] = *req.LeaderAvatar
	}
	if req.StaffCount != nil {
		updates["staff_count"] = *req.StaffCount
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(updates) > 0 {
			if err := tx.Model(&model.Department{}).Where("id = ?", id).Updates(updates).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "更新部门",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update department: %w", err)
	}

	return s.GetDetail(access, id)
}

func (s *DepartmentService) Delete(access AccessContext, id string) error {
	depts, err := s.deptRepo.FindAll()
	if err != nil {
		return err
	}

	accessibleDeptIDs, err := resolveAccessibleDepartmentIDs(s.db, access)
	if err != nil {
		return fmt.Errorf("failed to resolve accessible departments: %w", err)
	}
	if !departmentAccessible(accessibleDeptIDs, id) {
		return fmt.Errorf("department is outside current data scope")
	}

	deleteOrder := collectDepartmentDeleteOrder(id, depts)
	if len(deleteOrder) == 0 {
		return fmt.Errorf("department not found")
	}

	var relatedUsers int64
	if err := s.db.Model(&model.User{}).Where("department_id IN ?", deleteOrder).Count(&relatedUsers).Error; err != nil {
		return fmt.Errorf("failed to validate department references: %w", err)
	}
	if relatedUsers > 0 {
		return fmt.Errorf("department subtree still contains %d users", relatedUsers)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, deptID := range deleteOrder {
			if err := tx.Where("id = ?", deptID).Delete(&model.Department{}).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "删除部门",
			Operator: access.UserID,
			Target:   id,
			Type:     "warning",
		}).Error
	})
}
