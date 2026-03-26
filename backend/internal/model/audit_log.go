package model

import (
	"time"
)

// AuditLog 审计日志
type AuditLog struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	Action    string    `gorm:"column:action;index" json:"action"`
	Operator  string    `gorm:"column:operator;index" json:"operator"`
	Target    string    `gorm:"column:target" json:"target"`
	Type      string    `gorm:"column:type;index" json:"type"` // info | warning | success
	CreatedAt time.Time `gorm:"column:created_at;index" json:"createdAt"`
}

// TableName 指定表名
func (AuditLog) TableName() string {
	return "audit_logs"
}
