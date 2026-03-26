package service

import "gorm.io/gorm"

type PositionService struct {
	db *gorm.DB
}

func NewPositionService(db *gorm.DB) *PositionService {
	return &PositionService{db: db}
}
