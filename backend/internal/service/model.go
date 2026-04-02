package service

import (
	"fmt"
	"strings"

	"go.uber.org/zap"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
)

// AIModelService 大模型配置服务
type AIModelService struct {
	repo   *repository.AIModelRepository
	logger *zap.Logger
}

func NewAIModelService(repo *repository.AIModelRepository, logger *zap.Logger) *AIModelService {
	return &AIModelService{repo: repo, logger: logger}
}

// ModelVO 对外返回时脱敏 API Key
type ModelVO struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Provider    string `json:"provider"`
	ModelName   string `json:"modelName"`
	APIKey      string `json:"apiKey"`      // 脱敏后的值
	APIEndpoint string `json:"apiEndpoint"`
	Enabled     bool   `json:"enabled"`
	Description string `json:"description"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

func toVO(m *model.AIModel) ModelVO {
	masked := maskAPIKey(m.APIKey)
	return ModelVO{
		ID:          m.ID,
		Name:        m.Name,
		Provider:    m.Provider,
		ModelName:   m.ModelName,
		APIKey:      masked,
		APIEndpoint: m.APIEndpoint,
		Enabled:     m.Enabled,
		Description: m.Description,
		CreatedAt:   m.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   m.UpdatedAt.Format("2006-01-02 15:04:05"),
	}
}

// maskAPIKey 保留前 8 位，其余替换为 *
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return strings.Repeat("*", len(key))
	}
	return key[:8] + strings.Repeat("*", len(key)-8)
}

// List 获取所有模型（脱敏）
func (s *AIModelService) List() ([]ModelVO, error) {
	models, err := s.repo.List()
	if err != nil {
		return nil, err
	}
	vos := make([]ModelVO, 0, len(models))
	for _, m := range models {
		vos = append(vos, toVO(m))
	}
	return vos, nil
}

// CreateInput 创建模型的输入
type CreateModelInput struct {
	Name        string `json:"name"        binding:"required"`
	Provider    string `json:"provider"    binding:"required"`
	ModelName   string `json:"modelName"   binding:"required"`
	APIKey      string `json:"apiKey"      binding:"required"`
	APIEndpoint string `json:"apiEndpoint"`
	Description string `json:"description"`
}

// Create 创建模型（初始状态为停用）
func (s *AIModelService) Create(input CreateModelInput) (ModelVO, error) {
	m := &model.AIModel{
		Name:        input.Name,
		Provider:    input.Provider,
		ModelName:   input.ModelName,
		APIKey:      input.APIKey,
		APIEndpoint: input.APIEndpoint,
		Description: input.Description,
		Enabled:     false,
	}
	if err := s.repo.Create(m); err != nil {
		return ModelVO{}, fmt.Errorf("创建模型失败: %w", err)
	}
	return toVO(m), nil
}

// UpdateInput 更新模型的输入（API Key 为空时保持原值）
type UpdateModelInput struct {
	Name        string `json:"name"`
	Provider    string `json:"provider"`
	ModelName   string `json:"modelName"`
	APIKey      string `json:"apiKey"`
	APIEndpoint string `json:"apiEndpoint"`
	Description string `json:"description"`
}

// Update 更新模型配置
func (s *AIModelService) Update(id string, input UpdateModelInput) (ModelVO, error) {
	m, err := s.repo.FindByID(id)
	if err != nil {
		return ModelVO{}, err
	}

	if input.Name != "" {
		m.Name = input.Name
	}
	if input.Provider != "" {
		m.Provider = input.Provider
	}
	if input.ModelName != "" {
		m.ModelName = input.ModelName
	}
	// API Key 不为空且不包含 * 时才更新（前端回显的脱敏值含 *，原样传回时不覆盖）
	if input.APIKey != "" && !strings.Contains(input.APIKey, "*") {
		m.APIKey = input.APIKey
	}
	m.APIEndpoint = input.APIEndpoint
	m.Description = input.Description

	if err := s.repo.Update(m); err != nil {
		return ModelVO{}, fmt.Errorf("更新模型失败: %w", err)
	}
	return toVO(m), nil
}

func isAllStars(s string) bool {
	for _, c := range s {
		if c != '*' {
			return false
		}
	}
	return true
}

// Enable 启用指定模型（同时停用其他所有模型）
func (s *AIModelService) Enable(id string) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.EnableOnly(id)
}

// Disable 停用指定模型
func (s *AIModelService) Disable(id string) error {
	if _, err := s.repo.FindByID(id); err != nil {
		return err
	}
	return s.repo.Disable(id)
}

// Delete 删除模型
func (s *AIModelService) Delete(id string) error {
	m, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}
	if m.Enabled {
		return fmt.Errorf("请先停用该模型再删除")
	}
	return s.repo.Delete(id)
}
