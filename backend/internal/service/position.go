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

type PositionService struct {
	db      *gorm.DB
	posRepo *repository.PositionRepository
	logger  *zap.Logger
}

func NewPositionService(db *gorm.DB, posRepo *repository.PositionRepository, logger *zap.Logger) *PositionService {
	return &PositionService{
		db:      db,
		posRepo: posRepo,
		logger:  logger,
	}
}

func (s *PositionService) ListCategories() ([]model.PositionCategory, error) {
	var categories []model.PositionCategory
	if err := s.db.Order("sort_order ASC").Find(&categories).Error; err != nil {
		return nil, fmt.Errorf("failed to query position categories: %w", err)
	}
	return categories, nil
}

func (s *PositionService) CreateCategory(access AccessContext, req dto.CreatePositionCategoryReq) (*model.PositionCategory, error) {
	category := model.PositionCategory{
		Code:        strings.ToLower(strings.TrimSpace(req.Code)),
		Name:        strings.TrimSpace(req.Name),
		Color:       strings.TrimSpace(req.Color),
		Icon:        strings.TrimSpace(req.Icon),
		SortOrder:   req.SortOrder,
		Description: strings.TrimSpace(req.Description),
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&category).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建岗位类别",
			Operator: access.UserID,
			Target:   category.Code,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to create position category: %w", err)
	}

	return &category, nil
}

func (s *PositionService) UpdateCategory(access AccessContext, code string, req dto.UpdatePositionCategoryReq) (*model.PositionCategory, error) {
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Color != nil {
		updates["color"] = strings.TrimSpace(*req.Color)
	}
	if req.Icon != nil {
		updates["icon"] = strings.TrimSpace(*req.Icon)
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(updates) > 0 {
			if err := tx.Model(&model.PositionCategory{}).Where("code = ?", code).Updates(updates).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "更新岗位类别",
			Operator: access.UserID,
			Target:   code,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update position category: %w", err)
	}

	var category model.PositionCategory
	if err := s.db.Where("code = ?", code).First(&category).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (s *PositionService) DeleteCategory(access AccessContext, code string) error {
	var positionCount int64
	if err := s.db.Model(&model.Position{}).Where("category_code = ?", code).Count(&positionCount).Error; err != nil {
		return fmt.Errorf("failed to validate category references: %w", err)
	}
	if positionCount > 0 {
		return fmt.Errorf("category still contains %d positions", positionCount)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("code = ?", code).Delete(&model.PositionCategory{}).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "删除岗位类别",
			Operator: access.UserID,
			Target:   code,
			Type:     "warning",
		}).Error
	})
}

func (s *PositionService) ListPositions() ([]model.Position, error) {
	positions, err := s.posRepo.FindAll()
	if err != nil {
		return nil, err
	}
	slices.SortFunc(positions, func(a, b model.Position) int {
		if a.CategoryCode == b.CategoryCode {
			if a.Level == b.Level {
				return strings.Compare(a.Name, b.Name)
			}
			if a.Level < b.Level {
				return -1
			}
			return 1
		}
		return strings.Compare(a.CategoryCode, b.CategoryCode)
	})
	return positions, nil
}

func (s *PositionService) CreatePosition(access AccessContext, req dto.CreatePositionReq) (*model.Position, error) {
	position := model.Position{
		ID:           newID("pos"),
		Name:         strings.TrimSpace(req.Name),
		Code:         strings.ToUpper(strings.TrimSpace(req.Code)),
		CategoryCode: strings.TrimSpace(req.CategoryCode),
		Level:        req.Level,
		Description:  strings.TrimSpace(req.Description),
		Headcount:    req.Headcount,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&position).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建岗位",
			Operator: access.UserID,
			Target:   position.ID,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to create position: %w", err)
	}

	return &position, nil
}

func (s *PositionService) UpdatePosition(access AccessContext, id string, req dto.UpdatePositionReq) (*model.Position, error) {
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Code != nil {
		updates["code"] = strings.ToUpper(strings.TrimSpace(*req.Code))
	}
	if req.CategoryCode != nil {
		updates["category_code"] = strings.TrimSpace(*req.CategoryCode)
	}
	if req.Level != nil {
		updates["level"] = *req.Level
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.Headcount != nil {
		updates["headcount"] = *req.Headcount
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if len(updates) > 0 {
			if err := tx.Model(&model.Position{}).Where("id = ?", id).Updates(updates).Error; err != nil {
				return err
			}
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "更新岗位",
			Operator: access.UserID,
			Target:   id,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to update position: %w", err)
	}

	return s.posRepo.FindByID(id)
}

func (s *PositionService) DeletePosition(access AccessContext, id string) error {
	var positionUsageCount int64
	if err := s.db.Model(&model.UserPosition{}).Where("position_id = ?", id).Count(&positionUsageCount).Error; err != nil {
		return fmt.Errorf("failed to validate position references: %w", err)
	}
	if positionUsageCount > 0 {
		return fmt.Errorf("position still has %d bound users", positionUsageCount)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", id).Delete(&model.Position{}).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "删除岗位",
			Operator: access.UserID,
			Target:   id,
			Type:     "warning",
		}).Error
	})
}
