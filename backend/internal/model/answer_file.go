package model

import "time"

// AnswerFile 答题文件记录
// Status 状态流转: uploaded → grading → graded → reviewed
type AnswerFile struct {
	// 短字符串显式 VARCHAR，避免 MySQL 上被建成 TEXT 后无法建索引（Error 1170）
	ID            string     `gorm:"column:id;primaryKey;type:varchar(64)" json:"id"`
	ExamSessionID string     `gorm:"column:exam_session_id;type:varchar(64);index" json:"examSessionId"`
	UploaderID    string     `gorm:"column:uploader_id;type:varchar(64);not null" json:"uploaderId"`
	UploaderName  string     `gorm:"column:uploader_name;type:varchar(128)" json:"uploaderName"`
	UploaderType  string     `gorm:"column:uploader_type;type:varchar(32)" json:"uploaderType"` // student | staff
	OriginalName  string     `gorm:"column:original_name;type:varchar(512);not null" json:"originalName"`
	FileKey       string     `gorm:"column:file_key;type:varchar(1024);not null" json:"fileKey"`
	FileURL       string     `gorm:"column:file_url;type:varchar(2048)" json:"fileUrl"`
	FileSize      int64      `gorm:"column:file_size;default:0" json:"fileSize"`
	ClassID       string     `gorm:"column:class_id;type:varchar(64)" json:"classId"`
	ClassName     string     `gorm:"column:class_name;type:varchar(128)" json:"className"`
	BatchID       string     `gorm:"column:batch_id;type:varchar(64)" json:"batchId"`
	Status        string     `gorm:"column:status;type:varchar(32);default:uploaded" json:"status"` // uploaded|grading|graded|reviewed|failed
	AIComment     string     `gorm:"column:ai_comment;type:text" json:"aiComment"`                  // 向下兼容，保留纯文本批注
	AIScore       int        `gorm:"column:ai_score;default:0" json:"aiScore"`
	AIDetail      string     `gorm:"column:ai_detail;type:longtext" json:"aiDetail"` // 结构化 JSON 评分
	ManualScore   *int       `gorm:"column:manual_score" json:"manualScore"`         // null=未复阅
	ManualComment string     `gorm:"column:manual_comment;type:text" json:"manualComment"`
	GraderID      string     `gorm:"column:grader_id;type:varchar(64)" json:"graderId"`
	GradedAt      *time.Time `gorm:"column:graded_at" json:"gradedAt"`
	CreatedAt     time.Time  `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time  `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (AnswerFile) TableName() string { return "answer_files" }
