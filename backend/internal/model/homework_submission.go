package model

import (
	"database/sql"
	"time"
)

// HomeworkSubmission 作业提交与审批结果
type HomeworkSubmission struct {
	ID                  string       `gorm:"column:id;primaryKey;type:varchar(64)" json:"id"`
	HomeworkID          string       `gorm:"column:homework_id;type:varchar(64);not null;index" json:"homeworkId"`
	StudentID           string       `gorm:"column:student_id;type:varchar(64);not null;index" json:"studentId"`
	StudentName         string       `gorm:"column:student_name;type:varchar(128);not null" json:"studentName"`
	ClassID             string       `gorm:"column:class_id;type:varchar(64);not null;index" json:"classId"`
	ClassName           string       `gorm:"column:class_name;type:varchar(255)" json:"className"`
	ArchiveFileKey      string       `gorm:"column:archive_file_key;type:varchar(1024);not null" json:"archiveFileKey"`
	ArchiveOriginalName string       `gorm:"column:archive_original_name;type:varchar(512);not null" json:"archiveOriginalName"`
	DocFileKey          string       `gorm:"column:doc_file_key;type:varchar(1024)" json:"docFileKey"`
	DocOriginalName     string       `gorm:"column:doc_original_name;type:varchar(512)" json:"docOriginalName"`
	DocContent          string       `gorm:"column:doc_content;type:longtext" json:"-"`
	CodeSummary         string       `gorm:"column:code_summary;type:longtext" json:"codeSummary"`
	ReviewStatus        string       `gorm:"column:review_status;type:varchar(32);not null;index" json:"reviewStatus"`
	ReviewScore         int          `gorm:"column:review_score" json:"reviewScore"`
	ReviewComment       string       `gorm:"column:review_comment;type:text" json:"reviewComment"`
	ReviewDetail        string       `gorm:"column:review_detail;type:longtext" json:"reviewDetail"`
	SubmittedAt         time.Time    `gorm:"column:submitted_at;autoCreateTime" json:"submittedAt"`
	ReviewedAt          *time.Time   `gorm:"column:reviewed_at" json:"reviewedAt"`
	CreatedAt           time.Time    `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt           time.Time    `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
	DeletedAt           sql.NullTime `gorm:"column:deleted_at;index" json:"-"`

	HomeworkTitle string `gorm:"-" json:"homeworkTitle"`
}

func (HomeworkSubmission) TableName() string { return "homework_submissions" }
