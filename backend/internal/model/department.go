package model

import (
	"database/sql"
	"time"
)

// Department 部门模型
type Department struct {
	ID             string        `gorm:"column:id;primaryKey" json:"id"`
	Name           string        `gorm:"column:name" json:"name"`
	Code           string        `gorm:"column:code;uniqueIndex" json:"code"`
	ParentID       *string       `gorm:"column:parent_id;index" json:"parentId"`
	Level          string        `gorm:"column:level" json:"level"` // university | college | stage | major | class
	LeaderName     string        `gorm:"column:leader_name" json:"leaderName"`
	LeaderTitle    string        `gorm:"column:leader_title" json:"leaderTitle"`
	LeaderAvatar   *string       `gorm:"column:leader_avatar" json:"leaderAvatar"`
	StaffCount     int           `gorm:"column:staff_count" json:"staffCount"`
	Status         string        `gorm:"column:status" json:"status"` // operational
	CreatedAt      time.Time     `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time     `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt      sql.NullTime  `gorm:"column:deleted_at;index" json:"-"`

	// Relations
	Children []Department `gorm:"foreignKey:ParentID;references:ID" json:"children,omitempty"`

	// Runtime fields
	Leader DepartmentLeader `gorm:"-" json:"leader,omitempty"`
}

// TableName 指定表名
func (Department) TableName() string {
	return "departments"
}

// DepartmentLeader 部门负责人（嵌入式）
type DepartmentLeader struct {
	Name   string `json:"name"`
	Title  string `json:"title"`
	Avatar *string `json:"avatar,omitempty"`
}
