package db

import (
	"fmt"

	"bw-ai-check/backend/internal/model"
	"gorm.io/gorm"
)

// InitDatabase 初始化数据库（创建表和初始数据）
func InitDatabase(db *gorm.DB) error {
	// 1. 自动迁移创建表
	if err := db.AutoMigrate(
		&model.Department{},
		&model.Role{},
		&model.Menu{},
		&model.User{},
		&model.UserRole{},
		&model.Grade{},
		&model.AuditLog{},
		&model.HomeworkTask{},
		&model.HomeworkTaskClass{},
		&model.HomeworkSubmission{},
	); err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	// 2. 检查是否已有数据，避免重复插入
	var deptCount int64
	if err := db.Model(&model.Department{}).Count(&deptCount).Error; err != nil {
		return err
	}

	// 如果已有数据，说明已初始化过
	if deptCount > 0 {
		return nil
	}

	// 3. 插入初始数据
	if err := seedDepartments(db); err != nil {
		return err
	}

	if err := seedRoles(db); err != nil {
		return err
	}

	if err := seedMenus(db); err != nil {
		return err
	}

	if err := seedUsers(db); err != nil {
		return err
	}

	if err := seedRoleMenus(db); err != nil {
		return err
	}

	if err := seedGrades(db); err != nil {
		return err
	}

	if err := seedUserRoles(db); err != nil {
		return err
	}

	if err := seedAuditLogs(db); err != nil {
		return err
	}

	return nil
}

func seedDepartments(db *gorm.DB) error {
	departments := []model.Department{
		makeDepartment("dept-root", "北京八维研修学院", "BWYX", nil, "university", "王校长", "校长", 3200),
		makeDepartment("dept-affairs", "教务部门", "AFFAIRS", stringPtr("dept-root"), "college", "李教务", "教务主任", 8),
	}

	colleges := []struct {
		id   string
		name string
		code string
	}{
		{id: "dept-fs", name: "全栈开发学院", code: "FS"},
		{id: "dept-cc", name: "云计算学院", code: "CC"},
		{id: "dept-mc", name: "传媒学院", code: "MC"},
		{id: "dept-gd", name: "游戏学院", code: "GD"},
		{id: "dept-hm", name: "鸿蒙学院", code: "HM"},
		{id: "dept-bd", name: "大数据学院", code: "BD"},
	}

	for _, college := range colleges {
		departments = append(departments, buildCollegeDepartments(college.id, college.name, college.code)...)
	}

	return db.CreateInBatches(departments, 100).Error
}

func seedRoles(db *gorm.DB) error {
	roles := []model.Role{
		{ID: "role-president", Name: "校长", Description: "学校最高行政负责人，拥有全部权限", DataScope: "school"},
		{ID: "role-dean", Name: "院长", Description: "学院负责人，管理学院事务", DataScope: "college"},
		{ID: "role-academic-director", Name: "教务处长", Description: "负责教务管理、课程审批和学术质量监控", DataScope: "school"},
		{ID: "role-major-lead", Name: "专业负责人", Description: "负责专业相关的教学管理", DataScope: "major"},
		{ID: "role-lecturer", Name: "讲师", Description: "教学和科研人员，基础权限", DataScope: "class"},
		{ID: "role-admin-office", Name: "行政办公室", Description: "负责日常行政管理和综合协调", DataScope: "school"},
		{ID: "role-student", Name: "学生", Description: "学生账号，仅保留基础访问能力", DataScope: "personal"},
	}
	return db.CreateInBatches(roles, 100).Error
}

func seedMenus(db *gorm.DB) error {
	menus := []model.Menu{
		{ID: "menu-dashboard", Name: "工作台", Path: "/dashboard", Icon: "DashboardOutlined", SortOrder: 1, Visible: true, Type: "menu"},
		{ID: "menu-access", Name: "权限管理", Path: "", Icon: "SafetyOutlined", SortOrder: 2, Visible: true, Type: "menu"},
		{ID: "menu-dept", Name: "部门管理", Path: "/departments", Icon: "ApartmentOutlined", ParentID: stringPtr("menu-access"), SortOrder: 1, Visible: true, Type: "menu"},
		{ID: "menu-role", Name: "角色管理", Path: "/roles", Icon: "TeamOutlined", ParentID: stringPtr("menu-access"), SortOrder: 2, Visible: true, Type: "menu"},
		{ID: "menu-user", Name: "用户管理", Path: "/users", Icon: "UserOutlined", ParentID: stringPtr("menu-access"), SortOrder: 3, Visible: true, Type: "menu"},
		{ID: "menu-menu", Name: "菜单管理", Path: "/menus", Icon: "MenuOutlined", ParentID: stringPtr("menu-access"), SortOrder: 4, Visible: true, Type: "menu"},
		{ID: "menu-audit", Name: "审计日志", Path: "/audit-logs", Icon: "AuditOutlined", SortOrder: 5, Visible: true, Type: "menu"},
		{ID: "menu-exam", Name: "阅卷管理", Path: "/exam", Icon: "AuditOutlined", SortOrder: 6, Visible: true, Type: "menu"},
		{ID: "menu-homework-approval", Name: "作业审批", Path: "/homework", Icon: "BookOutlined", SortOrder: 7, Visible: true, Type: "menu"},
		{ID: "menu-cycle", Name: "教学周期管理", Path: "/cycles", Icon: "CalendarOutlined", SortOrder: 8, Visible: true, Type: "menu"},
		{ID: "menu-model", Name: "模型管理", Path: "/models", Icon: "ApiOutlined", SortOrder: 9, Visible: true, Type: "menu"},

		// 部门管理按钮
		{ID: "menu-dept-add", Name: "新增部门", ParentID: stringPtr("menu-dept"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-dept-edit", Name: "编辑部门", ParentID: stringPtr("menu-dept"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-dept-delete", Name: "删除部门", ParentID: stringPtr("menu-dept"), SortOrder: 3, Visible: true, Type: "button"},
		{ID: "menu-dept-export", Name: "导出架构", ParentID: stringPtr("menu-dept"), SortOrder: 4, Visible: true, Type: "button"},

		// 角色管理按钮
		{ID: "menu-role-add", Name: "创建角色", ParentID: stringPtr("menu-role"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-role-edit", Name: "编辑角色", ParentID: stringPtr("menu-role"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-role-delete", Name: "删除角色", ParentID: stringPtr("menu-role"), SortOrder: 3, Visible: true, Type: "button"},
		{ID: "menu-role-assign", Name: "分配权限", ParentID: stringPtr("menu-role"), SortOrder: 4, Visible: true, Type: "button"},

		// 用户管理按钮
		{ID: "menu-user-add", Name: "新增用户", ParentID: stringPtr("menu-user"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-user-edit", Name: "编辑用户", ParentID: stringPtr("menu-user"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-user-delete", Name: "删除用户", ParentID: stringPtr("menu-user"), SortOrder: 3, Visible: true, Type: "button"},

		// 菜单管理按钮
		{ID: "menu-menu-add", Name: "新增菜单", ParentID: stringPtr("menu-menu"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-menu-edit", Name: "编辑菜单", ParentID: stringPtr("menu-menu"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-menu-delete", Name: "删除菜单", ParentID: stringPtr("menu-menu"), SortOrder: 3, Visible: true, Type: "button"},

		// 阅卷、周期管理按钮
		{ID: "menu-exam-upload", Name: "上传答题文件", ParentID: stringPtr("menu-exam"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-exam-batch", Name: "批量上传", ParentID: stringPtr("menu-exam"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-exam-delete", Name: "删除文件", ParentID: stringPtr("menu-exam"), SortOrder: 3, Visible: true, Type: "button"},
		{ID: "menu-cycle-manage", Name: "周期管理操作", ParentID: stringPtr("menu-cycle"), SortOrder: 1, Visible: true, Type: "button"},
	}
	return db.CreateInBatches(menus, 100).Error
}

func seedUsers(db *gorm.DB) error {
	users := []model.User{
		{
			ID:           "user-005",
			Name:         "赵明远",
			Email:        "zhao@seuu.edu",
			Initials:     stringPtr("ZMY"),
			DepartmentID: "dept-root",
			AccessStatus: "full",
			IsActive:     true,
			UserType:     "staff",
			LoginID:      "admin",
			PasswordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHQa9C", // 123456
		},
		{
			ID:           "user-006",
			Name:         "刘建国",
			Email:        "liu@seuu.edu",
			Initials:     stringPtr("LJG"),
			DepartmentID: "dept-fs",
			AccessStatus: "full",
			IsActive:     true,
			UserType:     "staff",
			LoginID:      "dean001",
			PasswordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHQa9C",
		},
		{
			ID:           "user-007",
			Name:         "李德",
			Email:        "li.de@seuu.edu",
			Initials:     stringPtr("LD"),
			DepartmentID: "dept-fs-pro-stage-major-1-1",
			AccessStatus: "full",
			IsActive:     true,
			UserType:     "student",
			LoginID:      "li.de@seuu.edu",
			PasswordHash: "$2a$10$y1451U91b5MyKSN2bZVnuucMywzQ68ILnKsjpVCZ5.26sa7bPMo/i",
		},
		{
			ID:           "user-001",
			Name:         "Dr. Elena Rodriguez",
			Email:        "elena.rodriguez@seuu.edu",
			Initials:     stringPtr("ER"),
			DepartmentID: "dept-affairs",
			AccessStatus: "full",
			IsActive:     true,
			UserType:     "staff",
			LoginID:      "elena",
			PasswordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHQa9C",
		},
	}
	return db.CreateInBatches(users, 100).Error
}

func seedRoleMenus(db *gorm.DB) error {
	roleMenus := []model.RoleMenu{
		{RoleID: "role-president", MenuID: "menu-dashboard"},
		{RoleID: "role-president", MenuID: "menu-access"},
		{RoleID: "role-president", MenuID: "menu-dept"},
		{RoleID: "role-president", MenuID: "menu-dept-add"},
		{RoleID: "role-president", MenuID: "menu-dept-edit"},
		{RoleID: "role-president", MenuID: "menu-dept-delete"},
		{RoleID: "role-president", MenuID: "menu-dept-export"},
		{RoleID: "role-president", MenuID: "menu-role"},
		{RoleID: "role-president", MenuID: "menu-role-add"},
		{RoleID: "role-president", MenuID: "menu-role-edit"},
		{RoleID: "role-president", MenuID: "menu-role-delete"},
		{RoleID: "role-president", MenuID: "menu-role-assign"},
		{RoleID: "role-president", MenuID: "menu-user"},
		{RoleID: "role-president", MenuID: "menu-user-add"},
		{RoleID: "role-president", MenuID: "menu-user-edit"},
		{RoleID: "role-president", MenuID: "menu-user-delete"},
		{RoleID: "role-president", MenuID: "menu-menu"},
		{RoleID: "role-president", MenuID: "menu-menu-add"},
		{RoleID: "role-president", MenuID: "menu-menu-edit"},
		{RoleID: "role-president", MenuID: "menu-menu-delete"},
		{RoleID: "role-president", MenuID: "menu-audit"},
		{RoleID: "role-president", MenuID: "menu-exam"},
		{RoleID: "role-president", MenuID: "menu-exam-upload"},
		{RoleID: "role-president", MenuID: "menu-exam-batch"},
		{RoleID: "role-president", MenuID: "menu-exam-delete"},
		{RoleID: "role-president", MenuID: "menu-homework-approval"},
		{RoleID: "role-president", MenuID: "menu-cycle"},
		{RoleID: "role-president", MenuID: "menu-cycle-manage"},
		{RoleID: "role-president", MenuID: "menu-model"},

		{RoleID: "role-admin-office", MenuID: "menu-dashboard"},
		{RoleID: "role-admin-office", MenuID: "menu-access"},
		{RoleID: "role-admin-office", MenuID: "menu-dept"},
		{RoleID: "role-admin-office", MenuID: "menu-dept-add"},
		{RoleID: "role-admin-office", MenuID: "menu-dept-edit"},
		{RoleID: "role-admin-office", MenuID: "menu-dept-export"},
		{RoleID: "role-admin-office", MenuID: "menu-user"},
		{RoleID: "role-admin-office", MenuID: "menu-user-add"},
		{RoleID: "role-admin-office", MenuID: "menu-user-edit"},

		{RoleID: "role-academic-director", MenuID: "menu-dashboard"},
		{RoleID: "role-academic-director", MenuID: "menu-access"},
		{RoleID: "role-academic-director", MenuID: "menu-dept"},
		{RoleID: "role-academic-director", MenuID: "menu-user"},
		{RoleID: "role-academic-director", MenuID: "menu-user-edit"},
		{RoleID: "role-academic-director", MenuID: "menu-exam"},
		{RoleID: "role-academic-director", MenuID: "menu-exam-upload"},
		{RoleID: "role-academic-director", MenuID: "menu-exam-batch"},
		{RoleID: "role-academic-director", MenuID: "menu-exam-delete"},
		{RoleID: "role-academic-director", MenuID: "menu-homework-approval"},
		{RoleID: "role-academic-director", MenuID: "menu-cycle"},
		{RoleID: "role-academic-director", MenuID: "menu-cycle-manage"},

		{RoleID: "role-dean", MenuID: "menu-dashboard"},
		{RoleID: "role-dean", MenuID: "menu-access"},
		{RoleID: "role-dean", MenuID: "menu-dept"},
		{RoleID: "role-dean", MenuID: "menu-user"},
		{RoleID: "role-dean", MenuID: "menu-user-edit"},
		{RoleID: "role-dean", MenuID: "menu-homework-approval"},

		{RoleID: "role-major-lead", MenuID: "menu-dashboard"},
		{RoleID: "role-major-lead", MenuID: "menu-access"},
		{RoleID: "role-major-lead", MenuID: "menu-dept"},
		{RoleID: "role-major-lead", MenuID: "menu-user"},
		{RoleID: "role-major-lead", MenuID: "menu-user-edit"},
		{RoleID: "role-major-lead", MenuID: "menu-exam"},
		{RoleID: "role-major-lead", MenuID: "menu-homework-approval"},

		{RoleID: "role-lecturer", MenuID: "menu-dashboard"},
		{RoleID: "role-lecturer", MenuID: "menu-exam"},
		{RoleID: "role-lecturer", MenuID: "menu-homework-approval"},

		{RoleID: "role-student", MenuID: "menu-dashboard"},
		{RoleID: "role-student", MenuID: "menu-homework-approval"},
	}
	return db.CreateInBatches(roleMenus, 100).Error
}

func seedGrades(db *gorm.DB) error {
	grades := []model.Grade{
		{ID: "grade-001", Code: "G1", Name: "一级", Level: 1},
		{ID: "grade-002", Code: "G2", Name: "二级", Level: 2},
		{ID: "grade-003", Code: "G3", Name: "三级", Level: 3},
		{ID: "grade-004", Code: "G4", Name: "四级", Level: 4},
		{ID: "grade-005", Code: "G5", Name: "五级", Level: 5},
		{ID: "grade-006", Code: "G6", Name: "六级", Level: 6},
	}
	return db.CreateInBatches(grades, 100).Error
}

func seedUserRoles(db *gorm.DB) error {
	userRoles := []model.UserRole{
		{UserID: "user-005", RoleID: "role-president"},
		{UserID: "user-006", RoleID: "role-dean"},
		{UserID: "user-007", RoleID: "role-major-lead"},
		{UserID: "user-001", RoleID: "role-academic-director"},
	}
	return db.CreateInBatches(userRoles, 100).Error
}

func seedAuditLogs(db *gorm.DB) error {
	logs := []model.AuditLog{
		{ID: "audit-001", Action: "创建用户", Operator: "admin", Target: "user-001", Type: "success"},
		{ID: "audit-002", Action: "修改角色权限", Operator: "admin", Target: "role-dean", Type: "success"},
		{ID: "audit-003", Action: "用户登录", Operator: "user-001", Target: "system", Type: "info"},
	}
	return db.CreateInBatches(logs, 100).Error
}

func stringPtr(s string) *string {
	return &s
}

func makeDepartment(id, name, code string, parentID *string, level, leaderName, leaderTitle string, staffCount int) model.Department {
	return model.Department{
		ID:          id,
		Name:        name,
		Code:        code,
		ParentID:    parentID,
		Level:       level,
		LeaderName:  leaderName,
		LeaderTitle: leaderTitle,
		StaffCount:  staffCount,
		Status:      "operational",
	}
}

func buildCollegeDepartments(id, name, code string) []model.Department {
	proStageID := fmt.Sprintf("%s-pro-stage", id)
	advStageID := fmt.Sprintf("%s-adv-stage", id)
	departments := []model.Department{
		makeDepartment(id, name, code, stringPtr("dept-root"), "college", "", "院长", 440),
		makeDepartment(proStageID, "专业阶段", fmt.Sprintf("%s-PRO-STAGE", code), stringPtr(id), "stage", "", "专业主任", 200),
		makeDepartment(advStageID, "专业高级阶段", fmt.Sprintf("%s-ADV-STAGE", code), stringPtr(id), "stage", "", "专高主任", 240),
	}

	departments = append(departments, makeProMajors(proStageID, code)...)
	departments = append(departments, makeAdvMajors(advStageID, code)...)
	return departments
}

func makeProMajors(stageID, collegeCode string) []model.Department {
	numbers := []string{"一", "二", "三", "四", "五"}
	departments := make([]model.Department, 0, 20)
	for idx, number := range numbers {
		majorID := fmt.Sprintf("%s-major-%d", stageID, idx+1)
		majorCode := fmt.Sprintf("%s-PRO-%d", collegeCode, idx+1)
		departments = append(departments, makeDepartment(majorID, fmt.Sprintf("专业%s", number), majorCode, stringPtr(stageID), "major", "", "专业负责人", 120))
		departments = append(departments, makeClasses(majorID, fmt.Sprintf("专业%s", number), majorCode)...)
	}
	return departments
}

func makeAdvMajors(stageID, collegeCode string) []model.Department {
	numbers := []string{"一", "二", "三", "四", "五", "六"}
	departments := make([]model.Department, 0, 18)
	for idx, number := range numbers {
		majorID := fmt.Sprintf("%s-major-%d", stageID, idx+1)
		majorCode := fmt.Sprintf("%s-ADV-%d", collegeCode, idx+1)
		departments = append(departments, makeDepartment(majorID, fmt.Sprintf("专高%s", number), majorCode, stringPtr(stageID), "major", "", "专业负责人", 120))
		departments = append(departments, makeClasses(majorID, fmt.Sprintf("专高%s", number), majorCode)...)
	}
	return departments
}

func makeClasses(majorID, majorName, majorCode string) []model.Department {
	classMap := map[string][]string{
		"专业一": {"2401A", "2402A", "2403A"},
		"专业二": {"2310A", "2311A", "2312A"},
		"专业三": {"2220A", "2221A", "2222A"},
		"专业四": {"2130A", "2131A"},
		"专业五": {"2040A", "2041A"},
		"专高一": {"2401B", "2402B"},
		"专高二": {"2310B", "2311B"},
		"专高三": {"2220B", "2221B"},
		"专高四": {"2130B", "2131B"},
		"专高五": {"2040B", "2041B"},
		"专高六": {"2405B", "2406B"},
	}

	classNames := classMap[majorName]
	departments := make([]model.Department, 0, len(classNames))
	for idx, className := range classNames {
		classID := fmt.Sprintf("%s-%d", majorID, idx+1)
		classCode := fmt.Sprintf("%s-%s", majorCode, className)
		departments = append(departments, makeDepartment(classID, className, classCode, stringPtr(majorID), "class", "", "班主任", 35))
	}
	return departments
}
