package service

import (
	"fmt"
	"sort"
	"strings"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/pkg/grader"
)

const examRiskThreshold = 75

type ExamTrendPoint struct {
	ExamDate    string `json:"examDate"`
	SessionID   string `json:"sessionId"`
	SessionName string `json:"sessionName"`
	Score       *int   `json:"score"`
	Status      string `json:"status"`
	BelowTarget bool   `json:"belowTarget"`
}

type ExamRiskStudent struct {
	StudentKey         string   `json:"studentKey"`
	StudentID          string   `json:"studentId"`
	StudentName        string   `json:"studentName"`
	ClassID            string   `json:"classId"`
	ClassName          string   `json:"className"`
	RiskLevel          string   `json:"riskLevel"`
	ConsecutiveLowDays int      `json:"consecutiveLowDays"`
	LatestScore        *int     `json:"latestScore"`
	AverageScore       float64  `json:"averageScore"`
	ReasonSummary      []string `json:"reasonSummary"`
}

type ExamStudentTrend struct {
	StudentKey         string           `json:"studentKey"`
	StudentID          string           `json:"studentId"`
	StudentName        string           `json:"studentName"`
	ClassID            string           `json:"classId"`
	ClassName          string           `json:"className"`
	AverageScore       float64          `json:"averageScore"`
	LatestScore        *int             `json:"latestScore"`
	LowScoreDays       int              `json:"lowScoreDays"`
	ConsecutiveLowDays int              `json:"consecutiveLowDays"`
	Flagged            bool             `json:"flagged"`
	RiskLevel          string           `json:"riskLevel"`
	ReasonSummary      []string         `json:"reasonSummary"`
	Points             []ExamTrendPoint `json:"points"`
}

type ExamClassTrendDate struct {
	ExamDate       string  `json:"examDate"`
	AverageScore   float64 `json:"averageScore"`
	SubmittedCount int     `json:"submittedCount"`
}

type ExamClassTrendSummary struct {
	ClassID             string               `json:"classId"`
	ClassName           string               `json:"className"`
	StudentCount        int                  `json:"studentCount"`
	FlaggedStudentCount int                  `json:"flaggedStudentCount"`
	AverageScore        float64              `json:"averageScore"`
	DateAverages        []ExamClassTrendDate `json:"dateAverages"`
}

type ExamTrendResponse struct {
	CycleID        string                  `json:"cycleId"`
	CycleName      string                  `json:"cycleName"`
	Threshold      int                     `json:"threshold"`
	ExamDates      []string                `json:"examDates"`
	Students       []ExamStudentTrend      `json:"students"`
	RiskStudents   []ExamRiskStudent       `json:"riskStudents"`
	ClassSummaries []ExamClassTrendSummary `json:"classSummaries"`
}

type examTrendFileRecord struct {
	model.AnswerFile
	ExamDate    string `gorm:"column:exam_date"`
	SessionName string `gorm:"column:session_name"`
}

type examTrendRegistry struct {
	byKey       map[string]*ExamStudentTrend
	byID        map[string]string
	byClassName map[string]string
}

// GetTrendReport 返回考试按日趋势与低分预警。
func (s *ExamService) GetTrendReport(access AccessContext, cycleID, classID string) (*ExamTrendResponse, error) {
	if access.UserType == "student" {
		return nil, fmt.Errorf("学生不能查看考试趋势")
	}
	cycle, sessions, classIDs, classNames, students, err := s.prepareExamTrendContext(access, cycleID, classID)
	if err != nil {
		return nil, err
	}
	files, err := s.listTrendFiles(cycleID, classIDs)
	if err != nil {
		return nil, err
	}
	return buildExamTrendReport(cycle, sessions, classNames, students, files), nil
}

func (s *ExamService) prepareExamTrendContext(access AccessContext, cycleID, classID string) (*model.TeachingCycle, []model.ExamSession, []string, map[string]string, []model.User, error) {
	cycle, err := s.getTeachingCycle(cycleID)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	sessions, err := s.listDailySessions(cycleID)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	classIDs, classNames, err := s.resolveExamTrendClasses(access, classID)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	students, err := s.listTrendStudents(classIDs)
	if err != nil {
		return nil, nil, nil, nil, nil, err
	}
	return cycle, sessions, classIDs, classNames, students, nil
}

func (s *ExamService) getTeachingCycle(cycleID string) (*model.TeachingCycle, error) {
	if strings.TrimSpace(cycleID) == "" {
		return nil, fmt.Errorf("请选择教学周期")
	}
	var cycle model.TeachingCycle
	if err := s.db.Where("id = ?", cycleID).First(&cycle).Error; err != nil {
		return nil, fmt.Errorf("教学周期不存在")
	}
	return &cycle, nil
}

func (s *ExamService) listDailySessions(cycleID string) ([]model.ExamSession, error) {
	var sessions []model.ExamSession
	err := s.db.Where("cycle_id = ? AND type = ?", cycleID, "daily").
		Order("exam_date ASC, sort_order ASC, created_at ASC").
		Find(&sessions).Error
	if err != nil {
		return nil, fmt.Errorf("读取日考数据失败: %w", err)
	}
	return sessions, nil
}

func (s *ExamService) resolveExamTrendClasses(access AccessContext, classID string) ([]string, map[string]string, error) {
	options, err := s.GetAccessibleClasses(access)
	if err != nil {
		return nil, nil, err
	}
	classNames := make(map[string]string, len(options))
	classIDs := make([]string, 0, len(options))
	for _, item := range options {
		classNames[item.ID] = item.Name
		classIDs = append(classIDs, item.ID)
	}
	if strings.TrimSpace(classID) == "" {
		return classIDs, classNames, nil
	}
	if _, ok := classNames[classID]; !ok {
		return nil, nil, fmt.Errorf("无权查看该班级")
	}
	return []string{classID}, classNames, nil
}

func (s *ExamService) listTrendStudents(classIDs []string) ([]model.User, error) {
	if len(classIDs) == 0 {
		return []model.User{}, nil
	}
	var users []model.User
	err := s.db.Model(&model.User{}).
		Select("id, name, class_id, class_name").
		Where("user_type = ?", "student").
		Where("class_id IN ?", classIDs).
		Order("class_name ASC, name ASC").
		Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("读取学生列表失败: %w", err)
	}
	return users, nil
}

func (s *ExamService) listTrendFiles(cycleID string, classIDs []string) ([]examTrendFileRecord, error) {
	if len(classIDs) == 0 {
		return []examTrendFileRecord{}, nil
	}
	var records []examTrendFileRecord
	err := s.db.Table("answer_files").
		Select("answer_files.*, exam_sessions.exam_date, exam_sessions.name AS session_name").
		Joins("JOIN exam_sessions ON exam_sessions.id = answer_files.exam_session_id").
		Where("exam_sessions.cycle_id = ? AND exam_sessions.type = ?", cycleID, "daily").
		Where("answer_files.class_id IN ?", classIDs).
		Order("exam_sessions.exam_date ASC, answer_files.created_at DESC").
		Scan(&records).Error
	if err != nil {
		return nil, fmt.Errorf("读取考试趋势数据失败: %w", err)
	}
	return records, nil
}

func buildExamTrendReport(cycle *model.TeachingCycle, sessions []model.ExamSession, classNames map[string]string, students []model.User, files []examTrendFileRecord) *ExamTrendResponse {
	registry := newExamTrendRegistry(students)
	selected := selectLatestExamFiles(registry, classNames, files)
	items := buildExamStudentTrends(registry, sessions, selected)
	riskStudents := buildExamRiskStudents(items)
	classSummaries := buildExamClassSummaries(items, sessions, classNames)
	return &ExamTrendResponse{
		CycleID:        cycle.ID,
		CycleName:      cycle.Name,
		Threshold:      examRiskThreshold,
		ExamDates:      extractExamDates(sessions),
		Students:       items,
		RiskStudents:   riskStudents,
		ClassSummaries: classSummaries,
	}
}

func newExamTrendRegistry(students []model.User) *examTrendRegistry {
	registry := &examTrendRegistry{
		byKey:       make(map[string]*ExamStudentTrend),
		byID:        make(map[string]string),
		byClassName: make(map[string]string),
	}
	for _, student := range students {
		classID := valueOrEmpty(student.ClassID)
		className := valueOrEmpty(student.ClassName)
		key := buildExamStudentKey(student.ID, student.Name, classID)
		registry.byKey[key] = &ExamStudentTrend{
			StudentKey:  key,
			StudentID:   student.ID,
			StudentName: student.Name,
			ClassID:     classID,
			ClassName:   className,
		}
		registry.byID[student.ID] = key
		registry.byClassName[classID+"|"+student.Name] = key
	}
	return registry
}

func selectLatestExamFiles(registry *examTrendRegistry, classNames map[string]string, files []examTrendFileRecord) map[string]examTrendFileRecord {
	selected := make(map[string]examTrendFileRecord)
	for _, item := range files {
		key := ensureExamTrendStudent(registry, classNames, item)
		compound := key + "|" + item.ExamSessionID
		if existing, ok := selected[compound]; ok && existing.CreatedAt.After(item.CreatedAt) {
			continue
		}
		selected[compound] = item
	}
	return selected
}

func ensureExamTrendStudent(registry *examTrendRegistry, classNames map[string]string, file examTrendFileRecord) string {
	if key, ok := registry.byID[file.UploaderID]; ok {
		return key
	}
	nameKey := file.ClassID + "|" + strings.TrimSpace(file.UploaderName)
	if key, ok := registry.byClassName[nameKey]; ok {
		return key
	}
	key := buildExamStudentKey("", file.UploaderName, file.ClassID)
	if _, ok := registry.byKey[key]; ok {
		return key
	}
	className := strings.TrimSpace(file.ClassName)
	if className == "" {
		className = classNames[file.ClassID]
	}
	registry.byKey[key] = &ExamStudentTrend{
		StudentKey:  key,
		StudentName: strings.TrimSpace(file.UploaderName),
		ClassID:     file.ClassID,
		ClassName:   className,
	}
	registry.byClassName[nameKey] = key
	return key
}

func buildExamStudentKey(studentID, studentName, classID string) string {
	if strings.TrimSpace(studentID) != "" {
		return studentID
	}
	return classID + "::" + strings.TrimSpace(studentName)
}

func buildExamStudentTrends(registry *examTrendRegistry, sessions []model.ExamSession, selected map[string]examTrendFileRecord) []ExamStudentTrend {
	items := make([]ExamStudentTrend, 0, len(registry.byKey))
	for _, student := range registry.byKey {
		trend := *student
		trend.Points = makeExamTrendPoints(student.StudentKey, sessions, selected)
		fillExamTrendSummary(&trend, selected)
		items = append(items, trend)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].ClassName == items[j].ClassName {
			return items[i].StudentName < items[j].StudentName
		}
		return items[i].ClassName < items[j].ClassName
	})
	return items
}

func makeExamTrendPoints(studentKey string, sessions []model.ExamSession, selected map[string]examTrendFileRecord) []ExamTrendPoint {
	points := make([]ExamTrendPoint, 0, len(sessions))
	for _, session := range sessions {
		record, ok := selected[studentKey+"|"+session.ID]
		if !ok {
			points = append(points, ExamTrendPoint{
				ExamDate: session.ExamDate, SessionID: session.ID, SessionName: session.Name, Status: "missing",
			})
			continue
		}
		score := resolveExamScore(record.AnswerFile)
		points = append(points, ExamTrendPoint{
			ExamDate:    session.ExamDate,
			SessionID:   session.ID,
			SessionName: session.Name,
			Score:       score,
			Status:      record.Status,
			BelowTarget: score != nil && *score < examRiskThreshold,
		})
	}
	return points
}

func resolveExamScore(file model.AnswerFile) *int {
	if file.ManualScore != nil {
		value := *file.ManualScore
		return &value
	}
	if file.Status == "graded" || file.Status == "reviewed" {
		value := file.AIScore
		return &value
	}
	return nil
}

func fillExamTrendSummary(item *ExamStudentTrend, selected map[string]examTrendFileRecord) {
	item.AverageScore = avgExamScores(item.Points)
	item.LatestScore = latestExamScore(item.Points)
	item.LowScoreDays, item.ConsecutiveLowDays = countExamLowScores(item.Points)
	item.Flagged = item.ConsecutiveLowDays >= 3
	item.RiskLevel = examRiskLevel(item.ConsecutiveLowDays, item.AverageScore, item.LatestScore)
	item.ReasonSummary = buildExamReasons(item, selected)
}

func avgExamScores(points []ExamTrendPoint) float64 {
	total := 0
	count := 0
	for _, point := range points {
		if point.Score == nil {
			continue
		}
		total += *point.Score
		count++
	}
	if count == 0 {
		return 0
	}
	return roundFloat(float64(total) / float64(count))
}

func latestExamScore(points []ExamTrendPoint) *int {
	for idx := len(points) - 1; idx >= 0; idx-- {
		if points[idx].Score != nil {
			value := *points[idx].Score
			return &value
		}
	}
	return nil
}

func countExamLowScores(points []ExamTrendPoint) (int, int) {
	lowDays := 0
	maxStreak := 0
	streak := 0
	for _, point := range points {
		if point.Score != nil && *point.Score < examRiskThreshold {
			lowDays++
			streak++
			if streak > maxStreak {
				maxStreak = streak
			}
			continue
		}
		streak = 0
	}
	return lowDays, maxStreak
}

func examRiskLevel(streak int, avg float64, latest *int) string {
	switch {
	case streak >= 3:
		return "high"
	case latest != nil && *latest < examRiskThreshold:
		return "medium"
	case avg > 0 && avg < examRiskThreshold:
		return "medium"
	default:
		return "low"
	}
}

func buildExamReasons(item *ExamStudentTrend, selected map[string]examTrendFileRecord) []string {
	reasons := make([]string, 0, 4)
	if item.ConsecutiveLowDays >= 3 {
		reasons = append(reasons, fmt.Sprintf("连续 %d 天成绩低于 %d 分", item.ConsecutiveLowDays, examRiskThreshold))
	}
	if item.LatestScore != nil && *item.LatestScore < 60 {
		reasons = append(reasons, "最新一次考试成绩低于 60 分")
	}
	if item.AverageScore > 0 && item.AverageScore < examRiskThreshold {
		reasons = append(reasons, fmt.Sprintf("阶段平均分 %.2f 分，低于预警线", item.AverageScore))
	}
	if drop := recentExamDrop(item.Points); drop >= 10 {
		reasons = append(reasons, fmt.Sprintf("最近一次较前一次下降 %d 分", drop))
	}
	reasons = append(reasons, topExamErrorHints(item.StudentKey, selected)...)
	return dedupeStrings(reasons)
}

func recentExamDrop(points []ExamTrendPoint) int {
	latest := -1
	previous := -1
	for idx := len(points) - 1; idx >= 0; idx-- {
		if points[idx].Score == nil {
			continue
		}
		if latest < 0 {
			latest = *points[idx].Score
			continue
		}
		previous = *points[idx].Score
		break
	}
	if latest < 0 || previous < 0 || previous <= latest {
		return 0
	}
	return previous - latest
}

func topExamErrorHints(studentKey string, selected map[string]examTrendFileRecord) []string {
	counters := make(map[string]int)
	for compound, record := range selected {
		if !strings.HasPrefix(compound, studentKey+"|") {
			continue
		}
		if detail := parseExamGradingDetail(record.AIDetail); detail != nil {
			for _, question := range detail.Questions {
				for _, point := range question.ErrorPoints {
					label := truncateText(strings.TrimSpace(point), 24)
					if label != "" {
						counters[label]++
					}
				}
			}
		}
	}
	if len(counters) == 0 {
		return nil
	}
	type pair struct {
		Label string
		Count int
	}
	items := make([]pair, 0, len(counters))
	for label, count := range counters {
		items = append(items, pair{Label: label, Count: count})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].Count > items[j].Count })
	result := make([]string, 0, 2)
	for idx, item := range items {
		if idx >= 2 {
			break
		}
		result = append(result, "高频失分点："+item.Label)
	}
	return result
}

func parseExamGradingDetail(raw string) *grader.GradingResult {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	result, err := grader.ParseResult(raw)
	if err != nil {
		return nil
	}
	return result
}

func buildExamRiskStudents(items []ExamStudentTrend) []ExamRiskStudent {
	result := make([]ExamRiskStudent, 0)
	for _, item := range items {
		if !item.Flagged {
			continue
		}
		result = append(result, ExamRiskStudent{
			StudentKey:         item.StudentKey,
			StudentID:          item.StudentID,
			StudentName:        item.StudentName,
			ClassID:            item.ClassID,
			ClassName:          item.ClassName,
			RiskLevel:          item.RiskLevel,
			ConsecutiveLowDays: item.ConsecutiveLowDays,
			LatestScore:        item.LatestScore,
			AverageScore:       item.AverageScore,
			ReasonSummary:      item.ReasonSummary,
		})
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].ConsecutiveLowDays == result[j].ConsecutiveLowDays {
			return result[i].StudentName < result[j].StudentName
		}
		return result[i].ConsecutiveLowDays > result[j].ConsecutiveLowDays
	})
	return result
}

func buildExamClassSummaries(items []ExamStudentTrend, sessions []model.ExamSession, classNames map[string]string) []ExamClassTrendSummary {
	grouped := make(map[string][]ExamStudentTrend)
	for _, item := range items {
		grouped[item.ClassID] = append(grouped[item.ClassID], item)
	}
	result := make([]ExamClassTrendSummary, 0, len(grouped))
	for classID, students := range grouped {
		result = append(result, ExamClassTrendSummary{
			ClassID:             classID,
			ClassName:           classNames[classID],
			StudentCount:        len(students),
			FlaggedStudentCount: countFlaggedStudents(students),
			AverageScore:        avgClassExamScore(students),
			DateAverages:        buildExamDateAverages(students, sessions),
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ClassName < result[j].ClassName })
	return result
}

func countFlaggedStudents(items []ExamStudentTrend) int {
	count := 0
	for _, item := range items {
		if item.Flagged {
			count++
		}
	}
	return count
}

func avgClassExamScore(items []ExamStudentTrend) float64 {
	total := 0.0
	count := 0
	for _, item := range items {
		if item.AverageScore <= 0 {
			continue
		}
		total += item.AverageScore
		count++
	}
	if count == 0 {
		return 0
	}
	return roundFloat(total / float64(count))
}

func buildExamDateAverages(students []ExamStudentTrend, sessions []model.ExamSession) []ExamClassTrendDate {
	result := make([]ExamClassTrendDate, 0, len(sessions))
	for idx, session := range sessions {
		total := 0
		count := 0
		for _, student := range students {
			if idx >= len(student.Points) || student.Points[idx].Score == nil {
				continue
			}
			total += *student.Points[idx].Score
			count++
		}
		average := 0.0
		if count > 0 {
			average = roundFloat(float64(total) / float64(count))
		}
		result = append(result, ExamClassTrendDate{
			ExamDate:       session.ExamDate,
			AverageScore:   average,
			SubmittedCount: count,
		})
	}
	return result
}

func extractExamDates(sessions []model.ExamSession) []string {
	result := make([]string, 0, len(sessions))
	for _, session := range sessions {
		result = append(result, session.ExamDate)
	}
	return result
}
