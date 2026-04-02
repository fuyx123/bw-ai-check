package service

import (
	"fmt"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
)

// ExamGraderService 阅卷老师分配服务
type ExamGraderService struct {
	repo        *repository.ExamGraderRepository
	sessionRepo *repository.ExamSessionRepository
}

// NewExamGraderService 创建阅卷老师分配服务
func NewExamGraderService(repo *repository.ExamGraderRepository, sessionRepo *repository.ExamSessionRepository) *ExamGraderService {
	return &ExamGraderService{repo: repo, sessionRepo: sessionRepo}
}

// UpsertInput 设置阅卷老师入参
type UpsertInput struct {
	ClassID    string `json:"classId" binding:"required"`
	ClassName  string `json:"className"`
	GraderID   string `json:"graderId" binding:"required"`
	GraderName string `json:"graderName"`
}

// Upsert 为指定考次设置阅卷老师（幂等）
func (s *ExamGraderService) Upsert(sessionID string, input UpsertInput) (*model.ExamGrader, error) {
	// 仅限周考/月考
	session, err := s.sessionRepo.FindByID(sessionID)
	if err != nil {
		return nil, fmt.Errorf("考次不存在")
	}
	if session.Type != "weekly" && session.Type != "monthly" {
		return nil, fmt.Errorf("仅周考和月考支持配置阅卷老师")
	}

	graderRecord := &model.ExamGrader{
		ExamSessionID: sessionID,
		ClassID:       input.ClassID,
		ClassName:     input.ClassName,
		GraderID:      input.GraderID,
		GraderName:    input.GraderName,
	}
	if err := s.repo.Upsert(graderRecord); err != nil {
		return nil, fmt.Errorf("保存阅卷老师分配失败: %w", err)
	}
	return graderRecord, nil
}

// Delete 删除阅卷老师分配
func (s *ExamGraderService) Delete(id string) error {
	return s.repo.Delete(id)
}

// ListBySession 查询考次的阅卷老师分配列表
func (s *ExamGraderService) ListBySession(sessionID string) ([]*model.ExamGrader, error) {
	return s.repo.ListBySession(sessionID)
}
