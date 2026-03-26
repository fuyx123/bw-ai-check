package service

import "gorm.io/gorm"

type DepartmentService struct {
	db *gorm.DB
}

func NewDepartmentService(db *gorm.DB) *DepartmentService {
	return &DepartmentService{db: db}
}
