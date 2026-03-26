package model

import (
	"database/sql"
	"time"
)

// Menu 菜单模型
type Menu struct {
	ID        string       `gorm:"column:id;primaryKey" json:"id"`
	Name      string       `gorm:"column:name" json:"name"`
	Path      string       `gorm:"column:path" json:"path"`
	Icon      string       `gorm:"column:icon" json:"icon"`
	ParentID  *string      `gorm:"column:parent_id;index" json:"parentId"`
	SortOrder int          `gorm:"column:sort_order" json:"sortOrder"`
	Visible   bool         `gorm:"column:visible" json:"visible"`
	Type      string       `gorm:"column:type" json:"type"` // menu | button
	CreatedAt time.Time    `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time    `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt sql.NullTime `gorm:"column:deleted_at;index" json:"-"`

	// Relations
	Children []Menu `gorm:"foreignKey:ParentID;references:ID" json:"children,omitempty"`
	Roles    []Role `gorm:"many2many:role_menus;foreignKey:ID;joinForeignKey:MenuID;references:ID;joinReferences:RoleID" json:"-"`
}

// TableName 指定表名
func (Menu) TableName() string {
	return "menus"
}
