package model

import (
	"database/sql"
	"time"
)

// Role 角色模型
type Role struct {
	ID          string       `gorm:"column:id;primaryKey" json:"id"`
	Name        string       `gorm:"column:name;uniqueIndex" json:"name"`
	Description string       `gorm:"column:description" json:"description"`
	DataScope   string       `gorm:"column:data_scope" json:"dataScope"` // school | college | major | class
	UserCount   int          `gorm:"column:user_count" json:"userCount"`
	CreatedAt   time.Time    `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time    `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   sql.NullTime `gorm:"column:deleted_at;index" json:"-"`

	// Relations
	Menus []Menu `gorm:"many2many:role_menus;foreignKey:ID;joinForeignKey:RoleID;references:ID;joinReferences:MenuID" json:"menus,omitempty"`
	Users []User `gorm:"many2many:user_roles;foreignKey:ID;joinForeignKey:RoleID;references:ID;joinReferences:UserID" json:"-"`

	// Runtime fields
	Permissions []string `gorm:"-" json:"permissions"`
}

// TableName 指定表名
func (Role) TableName() string {
	return "roles"
}

// RoleMenu 角色菜单关联（多对多）
type RoleMenu struct {
	RoleID string `gorm:"column:role_id;primaryKey" json:"roleId"`
	MenuID string `gorm:"column:menu_id;primaryKey" json:"menuId"`
}

// TableName 指定表名
func (RoleMenu) TableName() string {
	return "role_menus"
}
