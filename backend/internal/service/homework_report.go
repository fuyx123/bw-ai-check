package service

import (
	"fmt"
	"slices"
	"sort"
	"strings"
	"time"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/pkg/homeworkreview"
)

type HomeworkSeverityStats struct {
	High   int `json:"high"`
	Medium int `json:"medium"`
	Low    int `json:"low"`
}

type HomeworkCommonIssue struct {
	Label    string `json:"label"`
	Category string `json:"category"`
	Severity string `json:"severity"`
	Count    int    `json:"count"`
}

type HomeworkKnowledgeWeakness struct {
	Name          string `json:"name"`
	WeakCount     int    `json:"weakCount"`
	PartialCount  int    `json:"partialCount"`
	MasteredCount int    `json:"masteredCount"`
}

type HomeworkKeyStudent struct {
	StudentID           string   `json:"studentId"`
	StudentName         string   `json:"studentName"`
	ClassID             string   `json:"classId"`
	ClassName           string   `json:"className"`
	RiskLevel           string   `json:"riskLevel"`
	RiskScore           int      `json:"riskScore"`
	ProblemCount        int      `json:"problemCount"`
	HighIssueCount      int      `json:"highIssueCount"`
	WeakKnowledgeCount  int      `json:"weakKnowledgeCount"`
	PartialKnowledgeCnt int      `json:"partialKnowledgeCount"`
	MainProblems        []string `json:"mainProblems"`
	WeakKnowledgePoints []string `json:"weakKnowledgePoints"`
}

type HomeworkClassReport struct {
	ClassID             string                      `json:"classId"`
	CollegeName         string                      `json:"collegeName"`
	MajorName           string                      `json:"majorName"`
	ClassName           string                      `json:"className"`
	ClassPath           string                      `json:"classPath"`
	TotalStudents       int                         `json:"totalStudents"`
	SubmittedCount      int                         `json:"submittedCount"`
	MissingCount        int                         `json:"missingCount"`
	ReviewedCount       int                         `json:"reviewedCount"`
	AverageScore        float64                     `json:"averageScore"`
	SeverityStats       HomeworkSeverityStats       `json:"severityStats"`
	CommonIssues        []HomeworkCommonIssue       `json:"commonIssues"`
	KnowledgeWeaknesses []HomeworkKnowledgeWeakness `json:"knowledgeWeaknesses"`
	KeyStudents         []HomeworkKeyStudent        `json:"keyStudents"`
}

type HomeworkReportOverview struct {
	ClassCount          int                         `json:"classCount"`
	TotalStudents       int                         `json:"totalStudents"`
	SubmittedCount      int                         `json:"submittedCount"`
	MissingCount        int                         `json:"missingCount"`
	ReviewedCount       int                         `json:"reviewedCount"`
	AverageScore        float64                     `json:"averageScore"`
	SeverityStats       HomeworkSeverityStats       `json:"severityStats"`
	CommonIssues        []HomeworkCommonIssue       `json:"commonIssues"`
	KnowledgeWeaknesses []HomeworkKnowledgeWeakness `json:"knowledgeWeaknesses"`
}

type HomeworkReportResponse struct {
	CheckDate   string                 `json:"checkDate"`
	Overview    HomeworkReportOverview `json:"overview"`
	Classes     []HomeworkClassReport  `json:"classes"`
	KeyStudents []HomeworkKeyStudent   `json:"keyStudents"`
}

type homeworkIssueCounter struct {
	Label    string
	Category string
	Severity string
	Count    int
}

type homeworkKnowledgeCounter struct {
	Name          string
	WeakCount     int
	PartialCount  int
	MasteredCount int
}

type homeworkStudentInsight struct {
	Submission          model.HomeworkSubmission
	Detail              *homeworkreview.Result
	ProblemCount        int
	HighIssueCount      int
	WeakKnowledgeCount  int
	PartialKnowledgeCnt int
	RiskScore           int
	MainProblems        []string
	WeakKnowledgePoints []string
}

// GetReport 返回作业审批汇报看板数据。
func (s *HomeworkService) GetReport(access AccessContext, checkDate, classID string) (*HomeworkReportResponse, error) {
	if access.UserType == "student" {
		return nil, fmt.Errorf("学生不能查看作业汇报")
	}
	checkDate = normalizeReportDate(checkDate)
	classOptions, classIDs, err := s.resolveHomeworkReportClasses(access, classID)
	if err != nil {
		return nil, err
	}
	students, err := s.listStudentsByClasses(classIDs)
	if err != nil {
		return nil, err
	}
	submissions, err := s.listHomeworkSubmissionsByDate(classIDs, checkDate)
	if err != nil {
		return nil, err
	}
	return buildHomeworkReport(checkDate, classOptions, students, submissions), nil
}

func (s *HomeworkService) resolveHomeworkReportClasses(access AccessContext, classID string) ([]HomeworkClassOption, []string, error) {
	classOptions, err := s.getAccessibleClasses(access)
	if err != nil {
		return nil, nil, err
	}
	classIDs := classIDsFromOptions(classOptions)
	if strings.TrimSpace(classID) == "" {
		return classOptions, classIDs, nil
	}
	filtered, ids, err := s.filterHomeworkClassesByDepartment(access, classOptions, classID)
	if err != nil {
		return nil, nil, err
	}
	return filtered, ids, nil
}

func (s *HomeworkService) filterHomeworkClassesByDepartment(access AccessContext, classOptions []HomeworkClassOption, departmentID string) ([]HomeworkClassOption, []string, error) {
	departmentID = strings.TrimSpace(departmentID)
	if departmentID == "" {
		return classOptions, classIDsFromOptions(classOptions), nil
	}
	if containsClass(classOptions, departmentID) {
		for _, item := range classOptions {
			if item.ID == departmentID {
				return []HomeworkClassOption{item}, []string{departmentID}, nil
			}
		}
	}
	depts, err := loadDepartments(s.db)
	if err != nil {
		return nil, nil, fmt.Errorf("读取组织架构失败: %w", err)
	}
	allowed := make(map[string]HomeworkClassOption, len(classOptions))
	for _, item := range classOptions {
		allowed[item.ID] = item
	}
	subtree := collectDepartmentSubtreeIDs(departmentID, depts)
	if len(subtree) == 0 {
		return nil, nil, fmt.Errorf("筛选节点不存在")
	}
	filtered := make([]HomeworkClassOption, 0)
	for classID, item := range allowed {
		if _, ok := subtree[classID]; ok {
			filtered = append(filtered, item)
		}
	}
	if len(filtered) == 0 {
		return nil, nil, fmt.Errorf("无权查看该筛选范围")
	}
	slices.SortFunc(filtered, func(a, b HomeworkClassOption) int { return strings.Compare(a.Name, b.Name) })
	return filtered, classIDsFromOptions(filtered), nil
}

func (s *HomeworkService) listHomeworkSubmissionsByDate(classIDs []string, checkDate string) ([]model.HomeworkSubmission, error) {
	if len(classIDs) == 0 {
		return []model.HomeworkSubmission{}, nil
	}
	var items []model.HomeworkSubmission
	err := s.db.Model(&model.HomeworkSubmission{}).
		Where("class_id IN ?", classIDs).
		Where("DATE(submitted_at) = ?", checkDate).
		Order("submitted_at DESC").
		Find(&items).Error
	if err != nil {
		return nil, fmt.Errorf("读取作业审批汇报数据失败: %w", err)
	}
	return items, nil
}

func buildHomeworkReport(checkDate string, classes []HomeworkClassOption, students []model.User, submissions []model.HomeworkSubmission) *HomeworkReportResponse {
	classReports := make([]HomeworkClassReport, 0, len(classes))
	studentMap := groupHomeworkStudentsByClass(students)
	submissionMap := mapHomeworkSubmissionsByClass(submissions)
	keyStudents := make([]HomeworkKeyStudent, 0)
	for _, classItem := range classes {
		report := buildHomeworkClassReport(classItem, studentMap[classItem.ID], submissionMap[classItem.ID])
		classReports = append(classReports, report)
		keyStudents = append(keyStudents, report.KeyStudents...)
	}
	sort.Slice(classReports, func(i, j int) bool { return classReports[i].ClassPath < classReports[j].ClassPath })
	sortHomeworkKeyStudents(keyStudents)
	if len(keyStudents) > 10 {
		keyStudents = keyStudents[:10]
	}
	return &HomeworkReportResponse{
		CheckDate:   checkDate,
		Overview:    buildHomeworkOverview(classReports),
		Classes:     classReports,
		KeyStudents: keyStudents,
	}
}

func groupHomeworkStudentsByClass(students []model.User) map[string][]model.User {
	result := make(map[string][]model.User)
	for _, student := range students {
		classID := valueOrEmpty(student.ClassID)
		if classID == "" {
			continue
		}
		result[classID] = append(result[classID], student)
	}
	return result
}

func mapHomeworkSubmissionsByClass(submissions []model.HomeworkSubmission) map[string][]model.HomeworkSubmission {
	result := make(map[string][]model.HomeworkSubmission)
	for _, item := range submissions {
		result[item.ClassID] = append(result[item.ClassID], item)
	}
	return result
}

func buildHomeworkClassReport(classItem HomeworkClassOption, students []model.User, submissions []model.HomeworkSubmission) HomeworkClassReport {
	insights := collectHomeworkInsights(submissions)
	report := HomeworkClassReport{
		ClassID:             classItem.ID,
		CollegeName:         classItem.CollegeName,
		MajorName:           classItem.MajorName,
		ClassName:           classItem.ClassName,
		ClassPath:           classItem.Name,
		TotalStudents:       len(students),
		SubmittedCount:      len(submissions),
		MissingCount:        maxInt(len(students)-len(submissions), 0),
		ReviewedCount:       countHomeworkReviewed(submissions),
		AverageScore:        avgHomeworkScore(submissions),
		SeverityStats:       mergeHomeworkSeverity(insights),
		CommonIssues:        topHomeworkIssues(insights, 5),
		KnowledgeWeaknesses: topHomeworkKnowledge(insights, 5),
		KeyStudents:         topHomeworkStudents(insights, 5),
	}
	return report
}

func collectHomeworkInsights(submissions []model.HomeworkSubmission) []homeworkStudentInsight {
	result := make([]homeworkStudentInsight, 0, len(submissions))
	for _, submission := range submissions {
		result = append(result, buildHomeworkInsight(submission))
	}
	return result
}

func buildHomeworkInsight(submission model.HomeworkSubmission) homeworkStudentInsight {
	detail := parseHomeworkReviewDetail(submission.ReviewDetail)
	highIssues, problems, weakPoints, partialPoints := inspectHomeworkDetail(detail)
	mainProblems := topHomeworkProblemLabels(detail, 3)
	weakKnowledge := topHomeworkWeakKnowledge(detail, 3)
	return homeworkStudentInsight{
		Submission:          submission,
		Detail:              detail,
		ProblemCount:        problems,
		HighIssueCount:      highIssues,
		WeakKnowledgeCount:  weakPoints,
		PartialKnowledgeCnt: partialPoints,
		RiskScore:           calcHomeworkRiskScore(highIssues, problems, weakPoints, partialPoints),
		MainProblems:        mainProblems,
		WeakKnowledgePoints: weakKnowledge,
	}
}

func parseHomeworkReviewDetail(raw string) *homeworkreview.Result {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	result, err := homeworkreview.ParseResult(raw)
	if err != nil {
		return nil
	}
	return result
}

func inspectHomeworkDetail(detail *homeworkreview.Result) (int, int, int, int) {
	if detail == nil {
		return 0, 0, 0, 0
	}
	highIssues := 0
	for _, item := range detail.Issues {
		if item.Severity == "high" {
			highIssues++
		}
	}
	weakPoints := 0
	partialPoints := 0
	for _, point := range detail.KnowledgePoints {
		switch point.Status {
		case "weak":
			weakPoints++
		case "partial":
			partialPoints++
		}
	}
	return highIssues, len(detail.Issues), weakPoints, partialPoints
}

func calcHomeworkRiskScore(highIssues, problems, weakPoints, partialPoints int) int {
	return highIssues*5 + weakPoints*4 + partialPoints*2 + problems
}

func topHomeworkProblemLabels(detail *homeworkreview.Result, limit int) []string {
	counters := aggregateHomeworkIssueCounters([]homeworkStudentInsight{{Detail: detail}})
	items := make([]string, 0, len(counters))
	for _, item := range counters {
		items = append(items, item.Label)
		if len(items) >= limit {
			break
		}
	}
	return items
}

func topHomeworkWeakKnowledge(detail *homeworkreview.Result, limit int) []string {
	if detail == nil {
		return nil
	}
	items := make([]string, 0, len(detail.KnowledgePoints))
	for _, point := range detail.KnowledgePoints {
		if point.Status != "weak" {
			continue
		}
		items = append(items, point.Name)
		if len(items) >= limit {
			break
		}
	}
	return items
}

func countHomeworkReviewed(items []model.HomeworkSubmission) int {
	count := 0
	for _, item := range items {
		if item.ReviewStatus == "approved" || item.ReviewStatus == "rejected" {
			count++
		}
	}
	return count
}

func avgHomeworkScore(items []model.HomeworkSubmission) float64 {
	if len(items) == 0 {
		return 0
	}
	total := 0
	for _, item := range items {
		total += item.ReviewScore
	}
	return roundFloat(float64(total) / float64(len(items)))
}

func mergeHomeworkSeverity(items []homeworkStudentInsight) HomeworkSeverityStats {
	stats := HomeworkSeverityStats{}
	for _, insight := range items {
		if insight.Detail == nil {
			continue
		}
		for _, issue := range insight.Detail.Issues {
			switch issue.Severity {
			case "high":
				stats.High++
			case "medium":
				stats.Medium++
			default:
				stats.Low++
			}
		}
	}
	return stats
}

func topHomeworkIssues(items []homeworkStudentInsight, limit int) []HomeworkCommonIssue {
	counters := aggregateHomeworkIssueCounters(items)
	result := make([]HomeworkCommonIssue, 0, minInt(limit, len(counters)))
	for idx, item := range counters {
		if idx >= limit {
			break
		}
		result = append(result, HomeworkCommonIssue{
			Label:    item.Label,
			Category: item.Category,
			Severity: item.Severity,
			Count:    item.Count,
		})
	}
	return result
}

func aggregateHomeworkIssueCounters(items []homeworkStudentInsight) []homeworkIssueCounter {
	counters := make(map[string]*homeworkIssueCounter)
	for _, insight := range items {
		if insight.Detail == nil {
			continue
		}
		for _, issue := range insight.Detail.Issues {
			label := buildHomeworkIssueLabel(issue)
			key := issue.Category + "|" + label
			current, ok := counters[key]
			if !ok {
				current = &homeworkIssueCounter{Label: label, Category: issue.Category, Severity: issue.Severity}
				counters[key] = current
			}
			current.Count++
			if homeworkSeverityWeight(issue.Severity) > homeworkSeverityWeight(current.Severity) {
				current.Severity = issue.Severity
			}
		}
	}
	return sortHomeworkIssueCounters(counters)
}

func buildHomeworkIssueLabel(issue homeworkreview.Issue) string {
	if strings.TrimSpace(issue.Title) != "" {
		return strings.TrimSpace(issue.Title)
	}
	return issueCategoryText(issue.Category)
}

func sortHomeworkIssueCounters(items map[string]*homeworkIssueCounter) []homeworkIssueCounter {
	result := make([]homeworkIssueCounter, 0, len(items))
	for _, item := range items {
		result = append(result, *item)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Count == result[j].Count {
			return homeworkSeverityWeight(result[i].Severity) > homeworkSeverityWeight(result[j].Severity)
		}
		return result[i].Count > result[j].Count
	})
	return result
}

func topHomeworkKnowledge(items []homeworkStudentInsight, limit int) []HomeworkKnowledgeWeakness {
	counters := make(map[string]*homeworkKnowledgeCounter)
	for _, insight := range items {
		if insight.Detail == nil {
			continue
		}
		for _, point := range insight.Detail.KnowledgePoints {
			name := strings.TrimSpace(point.Name)
			if name == "" {
				continue
			}
			current, ok := counters[name]
			if !ok {
				current = &homeworkKnowledgeCounter{Name: name}
				counters[name] = current
			}
			switch point.Status {
			case "weak":
				current.WeakCount++
			case "partial":
				current.PartialCount++
			default:
				current.MasteredCount++
			}
		}
	}
	return sortHomeworkKnowledgeCounters(counters, limit)
}

func sortHomeworkKnowledgeCounters(items map[string]*homeworkKnowledgeCounter, limit int) []HomeworkKnowledgeWeakness {
	result := make([]homeworkKnowledgeCounter, 0, len(items))
	for _, item := range items {
		result = append(result, *item)
	}
	sort.Slice(result, func(i, j int) bool {
		left := result[i].WeakCount*2 + result[i].PartialCount
		right := result[j].WeakCount*2 + result[j].PartialCount
		if left == right {
			return result[i].Name < result[j].Name
		}
		return left > right
	})
	output := make([]HomeworkKnowledgeWeakness, 0, minInt(limit, len(result)))
	for idx, item := range result {
		if idx >= limit {
			break
		}
		output = append(output, HomeworkKnowledgeWeakness{
			Name:          item.Name,
			WeakCount:     item.WeakCount,
			PartialCount:  item.PartialCount,
			MasteredCount: item.MasteredCount,
		})
	}
	return output
}

func topHomeworkStudents(items []homeworkStudentInsight, limit int) []HomeworkKeyStudent {
	result := make([]HomeworkKeyStudent, 0, len(items))
	for _, item := range items {
		if item.RiskScore <= 0 {
			continue
		}
		result = append(result, HomeworkKeyStudent{
			StudentID:           item.Submission.StudentID,
			StudentName:         item.Submission.StudentName,
			ClassID:             item.Submission.ClassID,
			ClassName:           item.Submission.ClassName,
			RiskLevel:           homeworkRiskLevel(item.RiskScore),
			RiskScore:           item.RiskScore,
			ProblemCount:        item.ProblemCount,
			HighIssueCount:      item.HighIssueCount,
			WeakKnowledgeCount:  item.WeakKnowledgeCount,
			PartialKnowledgeCnt: item.PartialKnowledgeCnt,
			MainProblems:        item.MainProblems,
			WeakKnowledgePoints: item.WeakKnowledgePoints,
		})
	}
	sortHomeworkKeyStudents(result)
	if len(result) > limit {
		result = result[:limit]
	}
	return result
}

func sortHomeworkKeyStudents(items []HomeworkKeyStudent) {
	sort.Slice(items, func(i, j int) bool {
		if items[i].RiskScore == items[j].RiskScore {
			return items[i].StudentName < items[j].StudentName
		}
		return items[i].RiskScore > items[j].RiskScore
	})
}

func homeworkRiskLevel(score int) string {
	switch {
	case score >= 14:
		return "high"
	case score >= 7:
		return "medium"
	default:
		return "low"
	}
}

func buildHomeworkOverview(classes []HomeworkClassReport) HomeworkReportOverview {
	overview := HomeworkReportOverview{ClassCount: len(classes)}
	allStudents := make([]HomeworkKeyStudent, 0)
	issueSource := make([]homeworkStudentInsight, 0)
	for _, item := range classes {
		overview.TotalStudents += item.TotalStudents
		overview.SubmittedCount += item.SubmittedCount
		overview.MissingCount += item.MissingCount
		overview.ReviewedCount += item.ReviewedCount
		overview.SeverityStats.High += item.SeverityStats.High
		overview.SeverityStats.Medium += item.SeverityStats.Medium
		overview.SeverityStats.Low += item.SeverityStats.Low
		allStudents = append(allStudents, item.KeyStudents...)
		for _, student := range item.KeyStudents {
			issueSource = append(issueSource, homeworkStudentInsight{
				Submission: model.HomeworkSubmission{
					StudentID:   student.StudentID,
					StudentName: student.StudentName,
					ClassID:     student.ClassID,
					ClassName:   student.ClassName,
				},
			})
		}
	}
	overview.AverageScore = avgHomeworkClassScore(classes)
	overview.CommonIssues = mergeHomeworkClassIssues(classes, 5)
	overview.KnowledgeWeaknesses = mergeHomeworkClassKnowledge(classes, 5)
	return overview
}

func avgHomeworkClassScore(classes []HomeworkClassReport) float64 {
	if len(classes) == 0 {
		return 0
	}
	total := 0.0
	count := 0
	for _, item := range classes {
		if item.SubmittedCount == 0 {
			continue
		}
		total += item.AverageScore * float64(item.SubmittedCount)
		count += item.SubmittedCount
	}
	if count == 0 {
		return 0
	}
	return roundFloat(total / float64(count))
}

func mergeHomeworkClassIssues(classes []HomeworkClassReport, limit int) []HomeworkCommonIssue {
	counters := make(map[string]*HomeworkCommonIssue)
	for _, classItem := range classes {
		for _, issue := range classItem.CommonIssues {
			key := issue.Category + "|" + issue.Label
			current, ok := counters[key]
			if !ok {
				clone := issue
				counters[key] = &clone
				continue
			}
			current.Count += issue.Count
			if homeworkSeverityWeight(issue.Severity) > homeworkSeverityWeight(current.Severity) {
				current.Severity = issue.Severity
			}
		}
	}
	result := make([]HomeworkCommonIssue, 0, len(counters))
	for _, item := range counters {
		result = append(result, *item)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].Count == result[j].Count {
			return result[i].Label < result[j].Label
		}
		return result[i].Count > result[j].Count
	})
	if len(result) > limit {
		result = result[:limit]
	}
	return result
}

func mergeHomeworkClassKnowledge(classes []HomeworkClassReport, limit int) []HomeworkKnowledgeWeakness {
	counters := make(map[string]*HomeworkKnowledgeWeakness)
	for _, classItem := range classes {
		for _, item := range classItem.KnowledgeWeaknesses {
			current, ok := counters[item.Name]
			if !ok {
				clone := item
				counters[item.Name] = &clone
				continue
			}
			current.WeakCount += item.WeakCount
			current.PartialCount += item.PartialCount
			current.MasteredCount += item.MasteredCount
		}
	}
	result := make([]HomeworkKnowledgeWeakness, 0, len(counters))
	for _, item := range counters {
		result = append(result, *item)
	}
	sort.Slice(result, func(i, j int) bool {
		left := result[i].WeakCount*2 + result[i].PartialCount
		right := result[j].WeakCount*2 + result[j].PartialCount
		if left == right {
			return result[i].Name < result[j].Name
		}
		return left > right
	})
	if len(result) > limit {
		result = result[:limit]
	}
	return result
}

func issueCategoryText(category string) string {
	switch category {
	case "requirement":
		return "需求实现"
	case "logic":
		return "逻辑实现"
	case "quality":
		return "代码质量"
	case "document":
		return "文档匹配"
	case "structure":
		return "项目结构"
	case "knowledge":
		return "知识点掌握"
	default:
		return "其他问题"
	}
}

func homeworkSeverityWeight(severity string) int {
	switch severity {
	case "high":
		return 3
	case "medium":
		return 2
	default:
		return 1
	}
}

func normalizeReportDate(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Now().Format("2006-01-02")
	}
	return value
}

func roundFloat(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}

func maxInt(left, right int) int {
	if left > right {
		return left
	}
	return right
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}
