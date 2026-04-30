package model

import (
	"database/sql"
	"time"
)

// HomeworkTask 作业任务
type HomeworkTask struct {
	ID          string       `gorm:"column:id;primaryKey;type:varchar(64)" json:"id"`
	Title       string       `gorm:"column:title;type:varchar(255);not null" json:"title"`
	Description string       `gorm:"column:description;type:text" json:"description"`
	PublishDate string       `gorm:"column:publish_date;type:varchar(32);index" json:"publishDate"`
	CheckDate   string       `gorm:"column:check_date;type:varchar(32);index" json:"checkDate"`
	IsActive    bool         `gorm:"column:is_active;default:true" json:"isActive"`
	CreatedAt   time.Time    `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time    `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
	DeletedAt   sql.NullTime `gorm:"column:deleted_at;index" json:"-"`

	ClassRefs  []HomeworkTaskClass `gorm:"foreignKey:HomeworkID;references:ID" json:"-"`
	ClassIDs   []string            `gorm:"-" json:"classIds"`
	ClassNames []string            `gorm:"-" json:"classNames"`
}

func (HomeworkTask) TableName() string { return "homework_tasks" }

// HomeworkTaskClass 作业与班级关联
type HomeworkTaskClass struct {
	HomeworkID string    `gorm:"column:homework_id;primaryKey;type:varchar(64)" json:"homeworkId"`
	ClassID    string    `gorm:"column:class_id;primaryKey;type:varchar(64)" json:"classId"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
}

func (HomeworkTaskClass) TableName() string { return "homework_task_classes" }
