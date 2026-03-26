package service

import "gorm.io/gorm"

type AuditLogService struct {
	db *gorm.DB
}

func NewAuditLogService(db *gorm.DB) *AuditLogService {
	return &AuditLogService{db: db}
}
