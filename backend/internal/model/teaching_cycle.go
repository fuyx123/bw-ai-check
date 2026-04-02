package model

import "time"

// TeachingCycle 教学周期
type TeachingCycle struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	Name      string    `gorm:"column:name;not null" json:"name"`
	StartDate string    `gorm:"column:start_date;not null" json:"startDate"` // YYYY-MM-DD
	EndDate   string    `gorm:"column:end_date;not null" json:"endDate"`     // YYYY-MM-DD
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`

	Sessions []ExamSession `gorm:"foreignKey:CycleID" json:"sessions,omitempty"`
}

func (TeachingCycle) TableName() string { return "teaching_cycles" }
