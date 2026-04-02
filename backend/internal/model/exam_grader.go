package model

import "time"

// ExamGrader 阅卷老师分配记录（仅周考/月考）
// 每个考次每个班级可分配一名阅卷老师
type ExamGrader struct {
	ID            string    `gorm:"column:id;primaryKey" json:"id"`
	ExamSessionID string    `gorm:"column:exam_session_id;not null;index" json:"examSessionId"`
	ClassID       string    `gorm:"column:class_id;not null" json:"classId"`
	ClassName     string    `gorm:"column:class_name" json:"className"`
	GraderID      string    `gorm:"column:grader_id;not null" json:"graderId"` // user.id
	GraderName    string    `gorm:"column:grader_name" json:"graderName"`       // 冗余，方便展示
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime" json:"createdAt"`
	UpdatedAt     time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updatedAt"`
}

func (ExamGrader) TableName() string { return "exam_graders" }
