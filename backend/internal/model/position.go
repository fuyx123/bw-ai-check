package model

import (
	"database/sql"
	"time"
)

// PositionCategory 岗位类别
type PositionCategory struct {
	Code      string       `gorm:"column:code;primaryKey" json:"code"`
	Name      string       `gorm:"column:name" json:"name"`
	Color     string       `gorm:"column:color" json:"color"`
	Icon      string       `gorm:"column:icon" json:"icon"`
	SortOrder int          `gorm:"column:sort_order" json:"sortOrder"`
	Description string     `gorm:"column:description" json:"description"`
	CreatedAt time.Time    `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time    `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt sql.NullTime `gorm:"column:deleted_at;index" json:"-"`

	// Relations
	Positions []Position `gorm:"foreignKey:CategoryCode;references:Code" json:"positions,omitempty"`
}

// TableName 指定表名
func (PositionCategory) TableName() string {
	return "position_categories"
}

// Position 岗位
type Position struct {
	ID           string       `gorm:"column:id;primaryKey" json:"id"`
	Name         string       `gorm:"column:name" json:"name"`
	Code         string       `gorm:"column:code;uniqueIndex" json:"code"`
	CategoryCode string       `gorm:"column:category_code;index" json:"categoryCode"`
	Level        int          `gorm:"column:level" json:"level"`
	Description  string       `gorm:"column:description" json:"description"`
	Headcount    int          `gorm:"column:headcount" json:"headcount"`
	CreatedAt    time.Time    `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    time.Time    `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt    sql.NullTime `gorm:"column:deleted_at;index" json:"-"`

	// Relations
	Category PositionCategory `gorm:"foreignKey:CategoryCode;references:Code" json:"-"`
	Users    []User           `gorm:"many2many:user_positions;foreignKey:ID;joinForeignKey:PositionID;references:ID;joinReferences:UserID" json:"-"`
}

// TableName 指定表名
func (Position) TableName() string {
	return "positions"
}

// UserPosition 用户岗位关联（多对多）
type UserPosition struct {
	UserID     string `gorm:"column:user_id;primaryKey" json:"userId"`
	PositionID string `gorm:"column:position_id;primaryKey" json:"positionId"`
}

// TableName 指定表名
func (UserPosition) TableName() string {
	return "user_positions"
}
