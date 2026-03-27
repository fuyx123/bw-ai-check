package service

import (
	"fmt"
	"slices"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
)

type GradeService struct {
	db        *gorm.DB
	gradeRepo *repository.GradeRepository
	logger    *zap.Logger
}

func NewGradeService(db *gorm.DB, gradeRepo *repository.GradeRepository, logger *zap.Logger) *GradeService {
	return &GradeService{
		db:        db,
		gradeRepo: gradeRepo,
		logger:    logger,
	}
}

func (s *GradeService) List() ([]model.Grade, error) {
	grades, err := s.gradeRepo.FindAll()
	if err != nil {
		return nil, err
	}
	slices.SortFunc(grades, func(a, b model.Grade) int {
		switch {
		case a.Level < b.Level:
			return -1
		case a.Level > b.Level:
			return 1
		default:
			return 0
		}
	})
	return grades, nil
}

func (s *GradeService) Create(access AccessContext, req dto.CreateGradeReq) (*model.Grade, error) {
	grade := model.Grade{
		ID:    newID("grade"),
		Code:  req.Code,
		Name:  req.Name,
		Level: req.Level,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&grade).Error; err != nil {
			return err
		}
		return tx.Create(&model.AuditLog{
			ID:       newID("audit"),
			Action:   "创建职级",
			Operator: access.UserID,
			Target:   grade.ID,
			Type:     "success",
		}).Error
	}); err != nil {
		return nil, fmt.Errorf("failed to create grade: %w", err)
	}

	return &grade, nil
}
