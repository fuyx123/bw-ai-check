package model

import (
	"database/sql"
	"time"
)

// Grade 职级（员工等级）
type Grade struct {
	ID        string       `gorm:"column:id;primaryKey" json:"id"`
	Code      string       `gorm:"column:code;uniqueIndex" json:"code"`
	Name      string       `gorm:"column:name" json:"name"`
	Level     int          `gorm:"column:level" json:"level"`
	CreatedAt time.Time    `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time    `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt sql.NullTime `gorm:"column:deleted_at;index" json:"-"`
}

// TableName 指定表名
func (Grade) TableName() string {
	return "grades"
}
