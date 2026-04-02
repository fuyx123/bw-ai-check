package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
)

// AIModelRepository 大模型配置仓储
type AIModelRepository struct {
	db *gorm.DB
}

func NewAIModelRepository(db *gorm.DB) *AIModelRepository {
	return &AIModelRepository{db: db}
}

func (r *AIModelRepository) Create(m *model.AIModel) error {
	m.ID = uuid.New().String()
	return r.db.Create(m).Error
}

func (r *AIModelRepository) FindByID(id string) (*model.AIModel, error) {
	var m model.AIModel
	if err := r.db.Where("id = ?", id).First(&m).Error; err != nil {
		return nil, fmt.Errorf("模型不存在")
	}
	return &m, nil
}

func (r *AIModelRepository) List() ([]*model.AIModel, error) {
	var models []*model.AIModel
	if err := r.db.Order("created_at DESC").Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}

func (r *AIModelRepository) Update(m *model.AIModel) error {
	m.UpdatedAt = time.Now()
	return r.db.Save(m).Error
}

func (r *AIModelRepository) Delete(id string) error {
	return r.db.Delete(&model.AIModel{}, "id = ?", id).Error
}

// EnableOnly 将指定模型设为启用，同时把其他所有模型设为停用（保证单活）
func (r *AIModelRepository) EnableOnly(id string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// 先全部停用
		if err := tx.Model(&model.AIModel{}).Where("1 = 1").Update("enabled", false).Error; err != nil {
			return err
		}
		// 再启用指定模型
		if err := tx.Model(&model.AIModel{}).Where("id = ?", id).Update("enabled", true).Error; err != nil {
			return err
		}
		return nil
	})
}

// Disable 停用指定模型
func (r *AIModelRepository) Disable(id string) error {
	return r.db.Model(&model.AIModel{}).Where("id = ?", id).Update("enabled", false).Error
}

// FindEnabled 查找当前启用的模型（最多一个）
func (r *AIModelRepository) FindEnabled() (*model.AIModel, error) {
	var m model.AIModel
	if err := r.db.Where("enabled = true").First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}
