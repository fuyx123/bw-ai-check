package model

import (
	"database/sql"
	"time"
)

// User 用户模型
type User struct {
	ID             string        `gorm:"column:id;primaryKey" json:"id"`
	Name           string        `gorm:"column:name" json:"name"`
	Email          string        `gorm:"column:email;uniqueIndex" json:"email"`
	LoginID        string        `gorm:"column:login_id;uniqueIndex" json:"loginId"`
	PasswordHash   string        `gorm:"column:password_hash" json:"-"`
	Avatar         *string       `gorm:"column:avatar" json:"avatar"`
	Initials       *string       `gorm:"column:initials" json:"initials"`
	UserType       string        `gorm:"column:user_type" json:"userType"` // student | staff
	DepartmentID   string        `gorm:"column:department_id" json:"departmentId"`
	DepartmentName string        `gorm:"-" json:"departmentName"` // 冗余字段，从 department 表关联
	AccessStatus   string        `gorm:"column:access_status" json:"accessStatus"` // full | partial | inactive
	IsActive       bool          `gorm:"column:is_active" json:"isActive"`
	Grade          *string       `gorm:"column:grade" json:"grade"` // 学生专属
	ClassName      *string       `gorm:"column:class_name" json:"className"` // 学生专属
	ClassID        *string       `gorm:"column:class_id" json:"classId"` // 学生专属
	CreatedAt      time.Time     `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time     `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt      sql.NullTime  `gorm:"column:deleted_at;index" json:"-"`

	// Relations
	Roles []Role `gorm:"many2many:user_roles;foreignKey:ID;joinForeignKey:UserID;references:ID;joinReferences:RoleID" json:"-"`
	Positions []Position `gorm:"many2many:user_positions;foreignKey:ID;joinForeignKey:UserID;references:ID;joinReferences:PositionID" json:"-"`

	// Runtime fields
	RoleIds   []string `gorm:"-" json:"roleIds"`
	RoleName  string   `gorm:"-" json:"roleName"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

// UserRole 用户角色关联（多对多）
type UserRole struct {
	UserID string `gorm:"column:user_id;primaryKey" json:"userId"`
	RoleID string `gorm:"column:role_id;primaryKey" json:"roleId"`
}

// TableName 指定表名
func (UserRole) TableName() string {
	return "user_roles"
}
