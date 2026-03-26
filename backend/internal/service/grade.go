package service

import "gorm.io/gorm"

type GradeService struct {
	db *gorm.DB
}

func NewGradeService(db *gorm.DB) *GradeService {
	return &GradeService{db: db}
}
