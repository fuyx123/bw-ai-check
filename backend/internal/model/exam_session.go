package model

import "time"

// ExamSession 考次（一场具体的日考/周考/月考）
type ExamSession struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	CycleID   string    `gorm:"column:cycle_id;not null;index" json:"cycleId"`
	Type      string    `gorm:"column:type;not null" json:"type"` // daily | weekly | monthly
	Name      string    `gorm:"column:name;not null" json:"name"` // 日考1 / 3月第一周周考 / 月考
	ExamDate  string    `gorm:"column:exam_date;not null" json:"examDate"` // YYYY-MM-DD
	UnitRange string    `gorm:"column:unit_range" json:"unitRange"` // 周考：覆盖单元范围，如 1-5单元
	SortOrder int       `gorm:"column:sort_order;default:0" json:"sortOrder"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`

	SubmitCount int64 `gorm:"-" json:"submitCount"` // 已提交人数（动态计算，不存库）
}

func (ExamSession) TableName() string { return "exam_sessions" }
