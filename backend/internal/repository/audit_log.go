package repository

import (
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// AuditLogRepository 审计日志数据访问层
type AuditLogRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewAuditLogRepository 创建审计日志仓储实例
func NewAuditLogRepository(db *gorm.DB, logger *zap.Logger) *AuditLogRepository {
	return &AuditLogRepository{
		db:     db,
		logger: logger,
	}
}

// FindAll 查询所有审计日志（分页）
func (r *AuditLogRepository) FindAll(page, pageSize int) ([]model.AuditLog, int64, error) {
	var logs []model.AuditLog
	var total int64

	if err := r.db.Model(&model.AuditLog{}).Count(&total).Error; err != nil {
		r.logger.Error("Failed to count audit logs", zap.Error(err))
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := r.db.Offset(offset).Limit(pageSize).Find(&logs).Error; err != nil {
		r.logger.Error("Failed to find audit logs", zap.Error(err))
		return nil, 0, err
	}

	return logs, total, nil
}

// Create 创建审计日志
func (r *AuditLogRepository) Create(log *model.AuditLog) error {
	return r.db.Create(log).Error
}
