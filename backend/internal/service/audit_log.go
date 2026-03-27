package service

import (
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
)

type AuditLogService struct {
	db           *gorm.DB
	auditLogRepo *repository.AuditLogRepository
	logger       *zap.Logger
}

func NewAuditLogService(db *gorm.DB, auditLogRepo *repository.AuditLogRepository, logger *zap.Logger) *AuditLogService {
	return &AuditLogService{
		db:           db,
		auditLogRepo: auditLogRepo,
		logger:       logger,
	}
}

func (s *AuditLogService) List(page, pageSize int) ([]model.AuditLog, int64, error) {
	page, pageSize = normalizePage(page, pageSize)

	var logs []model.AuditLog
	var total int64
	query := s.db.Model(&model.AuditLog{})
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count audit logs: %w", err)
	}
	if err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to query audit logs: %w", err)
	}
	return logs, total, nil
}
