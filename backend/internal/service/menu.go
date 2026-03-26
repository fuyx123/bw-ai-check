package service

import "gorm.io/gorm"

type MenuService struct {
	db *gorm.DB
}

func NewMenuService(db *gorm.DB) *MenuService {
	return &MenuService{db: db}
}
