package service

import (
	"fmt"
	"mime/multipart"
	"regexp"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"bw-ai-check/backend/internal/model"
	"bw-ai-check/backend/internal/repository"
)

// CycleService 教学周期服务
type CycleService struct {
	db          *gorm.DB
	cycleRepo   *repository.TeachingCycleRepository
	sessionRepo *repository.ExamSessionRepository
	logger      *zap.Logger
}

func NewCycleService(
	db *gorm.DB,
	cycleRepo *repository.TeachingCycleRepository,
	sessionRepo *repository.ExamSessionRepository,
	logger *zap.Logger,
) *CycleService {
	return &CycleService{db: db, cycleRepo: cycleRepo, sessionRepo: sessionRepo, logger: logger}
}

// CreateCycle 创建教学周期
func (s *CycleService) CreateCycle(name, startDate, endDate string) (*model.TeachingCycle, error) {
	cycle := &model.TeachingCycle{
		ID:        newID("cyc"),
		Name:      name,
		StartDate: startDate,
		EndDate:   endDate,
	}
	if err := s.cycleRepo.Create(cycle); err != nil {
		return nil, fmt.Errorf("创建教学周期失败: %w", err)
	}
	return cycle, nil
}

// ListCycles 查询所有周期，附带考次统计
func (s *CycleService) ListCycles() ([]*model.TeachingCycle, error) {
	return s.cycleRepo.List()
}

// GetCycleWithSessions 查询周期及其考次（含提交统计，按数据权限范围计数）
func (s *CycleService) GetCycleWithSessions(cycleID string, access AccessContext, classID string) (*model.TeachingCycle, error) {
	cycle, err := s.cycleRepo.FindByID(cycleID)
	if err != nil {
		return nil, fmt.Errorf("周期不存在")
	}

	sessions, err := s.sessionRepo.ListByCycle(cycleID)
	if err != nil {
		return nil, err
	}

	// 构建提交统计的数据范围过滤
	countFilter := s.buildSessionCountFilter(access, classID)
	counts, _ := s.sessionRepo.CountSubmitsByCycle(cycleID, countFilter)
	for _, sess := range sessions {
		sess.SubmitCount = counts[sess.ID]
	}

	cycle.Sessions = make([]model.ExamSession, len(sessions))
	for i, s := range sessions {
		cycle.Sessions[i] = *s
	}
	return cycle, nil
}

// buildSessionCountFilter 根据用户权限范围构建提交统计过滤条件
func (s *CycleService) buildSessionCountFilter(access AccessContext, classID string) repository.SessionCountFilter {
	filter := repository.SessionCountFilter{}

	switch {
	case access.UserType == "student":
		// 学生不计全局人数，留空（统计仅基于个人时前端单独处理）

	case access.DataScope == "class":
		if classID != "" {
			filter.ClassID = classID
		} else {
			filter.ClassID = access.DepartmentID
		}

	case access.DataScope == "school":
		filter.ClassID = classID // 可为空，表示全量

	default:
		if classID != "" {
			filter.ClassID = classID
		} else {
			accessible, err := resolveAccessibleDepartmentIDs(s.db, access)
			if err == nil {
				filter.ClassIDs = idsFromSet(accessible)
			}
		}
	}

	return filter
}

// DeleteCycle 删除周期（级联删除考次）
func (s *CycleService) DeleteCycle(cycleID string) error {
	if err := s.sessionRepo.DeleteByCycle(cycleID); err != nil {
		return err
	}
	return s.cycleRepo.Delete(cycleID)
}

// ImportSchedule 解析 Excel 考试安排表并导入考次
func (s *CycleService) ImportSchedule(cycleID string, fh *multipart.FileHeader) ([]*model.ExamSession, error) {
	cycle, err := s.cycleRepo.FindByID(cycleID)
	if err != nil {
		return nil, fmt.Errorf("周期不存在")
	}

	f, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("打开文件失败: %w", err)
	}
	defer f.Close()

	xl, err := excelize.OpenReader(f)
	if err != nil {
		return nil, fmt.Errorf("解析 Excel 失败: %w", err)
	}
	defer xl.Close()

	sheetName := xl.GetSheetName(0)
	rows, err := xl.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("读取工作表失败: %w", err)
	}

	sessions, err := parseScheduleRows(rows, cycle.StartDate)
	if err != nil {
		return nil, err
	}

	for _, sess := range sessions {
		sess.CycleID = cycleID
		sess.ID = newID("ses")
	}

	// 先清空旧考次，再批量写入
	if err := s.sessionRepo.DeleteByCycle(cycleID); err != nil {
		return nil, fmt.Errorf("清除旧考次失败: %w", err)
	}
	if len(sessions) > 0 {
		if err := s.sessionRepo.BatchCreate(sessions); err != nil {
			return nil, fmt.Errorf("保存考次失败: %w", err)
		}
	}

	s.logger.Info("导入考试安排表成功",
		zap.String("cycleID", cycleID),
		zap.Int("sessionCount", len(sessions)),
	)
	return sessions, nil
}

// parseScheduleRows 解析日历格网 Excel 行，返回考次列表
//
// Excel 结构：
//   - 第1行：标题（跳过）
//   - 之后每2行一组：奇数行=日期行，偶数行=考试行
//   - 每列对应周一～周日（最多7列）
func parseScheduleRows(rows [][]string, cycleStartDate string) ([]*model.ExamSession, error) {
	startDate, err := parseDate(cycleStartDate)
	if err != nil {
		return nil, fmt.Errorf("周期起始日期格式错误: %w", err)
	}

	var sessions []*model.ExamSession
	var allMonthly []*model.ExamSession
	order := 0

	// 从第2行（index=1）开始，每2行一组
	for i := 1; i+1 < len(rows); i += 2 {
		dateRow := padRow(rows[i], 7)
		examRow := padRow(rows[i+1], 7)

		for col := 0; col < 7; col++ {
			dateCell := strings.TrimSpace(dateRow[col])
			examCell := strings.TrimSpace(examRow[col])
			if dateCell == "" || examCell == "" {
				continue
			}

			// 解析日期（取第一行，换行符前的内容）
			datePart := strings.SplitN(dateCell, "\n", 2)[0]
			examDate, err := parseDate(datePart)
			if err != nil {
				continue // 非日期格，跳过
			}

			// 考试名称（取第一行）
			namePart := strings.SplitN(examCell, "\n", 2)[0]
			if namePart == "开课" || namePart == "" {
				continue
			}

			// 单元范围（取括号内内容）
			unitRange := extractUnitRange(examCell)

			// 判断考试类型
			var examType string
			switch {
			case strings.Contains(namePart, "日考"):
				examType = "daily"
			case strings.Contains(namePart, "周考"):
				examType = "weekly"
			case strings.Contains(namePart, "月考"):
				examType = "monthly"
			default:
				continue
			}

			order++
			sess := &model.ExamSession{
				Type:      examType,
				Name:      namePart,
				ExamDate:  examDate.Format("2006-01-02"),
				UnitRange: unitRange,
				SortOrder: order,
			}

			if examType == "monthly" {
				allMonthly = append(allMonthly, sess)
			} else {
				sessions = append(sessions, sess)
			}
		}
	}

	// 只保留周期开始日期之后的最后一个月考
	var actualMonthly *model.ExamSession
	for _, m := range allMonthly {
		d, err := time.Parse("2006-01-02", m.ExamDate)
		if err != nil {
			continue
		}
		if !d.Before(startDate) {
			actualMonthly = m
		}
	}
	if actualMonthly != nil {
		sessions = append(sessions, actualMonthly)
	}

	return sessions, nil
}

// parseDate 支持多种日期格式：2026/3/21、2026-03-21、2026/03/21
func parseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	formats := []string{
		"2006/1/2", "2006/01/02", "2006-1-2", "2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("无法解析日期: %s", s)
}

// extractUnitRange 从如 "3月第一周周考\n(1-5单元)" 中提取 "1-5单元"
func extractUnitRange(s string) string {
	re := regexp.MustCompile(`[（(]([^）)]+)[）)]`)
	m := re.FindStringSubmatch(s)
	if len(m) >= 2 {
		return m[1]
	}
	return ""
}

// padRow 确保 row 至少有 n 列
func padRow(row []string, n int) []string {
	if len(row) >= n {
		return row
	}
	padded := make([]string, n)
	copy(padded, row)
	return padded
}
