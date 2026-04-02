package model

import "time"

// AIModel 大模型配置表
type AIModel struct {
	ID          string    `gorm:"column:id;primaryKey"                json:"id"`
	Name        string    `gorm:"column:name;not null"                json:"name"`        // 展示名称
	Provider    string    `gorm:"column:provider;not null"            json:"provider"`    // openai / azure / deepseek / anthropic / custom
	ModelName   string    `gorm:"column:model_name;not null"          json:"modelName"`   // gpt-4o / deepseek-chat / …
	APIKey      string    `gorm:"column:api_key;not null"             json:"apiKey"`      // 存储时明文，返回时脱敏
	APIEndpoint string    `gorm:"column:api_endpoint"                 json:"apiEndpoint"` // 可选，自定义 base URL
	Enabled     bool      `gorm:"column:enabled;default:false"        json:"enabled"`
	Description string    `gorm:"column:description;type:text"        json:"description"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"    json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updated_at;autoUpdateTime"    json:"updatedAt"`
}

func (AIModel) TableName() string { return "ai_models" }
