package db

import (
	"fmt"

	"gorm.io/gorm"
	"bw-ai-check/backend/internal/model"
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
		&model.PositionCategory{},
		&model.Position{},
		&model.UserPosition{},
		&model.Grade{},
		&model.AuditLog{},
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

	if err := seedPositionCategories(db); err != nil {
		return err
	}

	if err := seedPositions(db); err != nil {
		return err
	}

	if err := seedGrades(db); err != nil {
		return err
	}

	if err := seedUserRoles(db); err != nil {
		return err
	}

	if err := seedUserPositions(db); err != nil {
		return err
	}

	if err := seedAuditLogs(db); err != nil {
		return err
	}

	return nil
}

func seedDepartments(db *gorm.DB) error {
	departments := []model.Department{
		{ID: "dept-root", Name: "东南联合大学", Code: "SEUU", ParentID: nil, Level: "university", LeaderName: "赵明远", LeaderTitle: "校长", StaffCount: 1284},
		{ID: "dept-ie", Name: "信息工程学院", Code: "IE", ParentID: stringPtr("dept-root"), Level: "college", LeaderName: "刘建国", LeaderTitle: "院长", StaffCount: 312},
		{ID: "dept-cs", Name: "计算机科学与技术", Code: "CS", ParentID: stringPtr("dept-ie"), Level: "major", LeaderName: "李德", LeaderTitle: "副教授", StaffCount: 84},
		{ID: "dept-cs-ai-lab", Name: "智能计算实验室", Code: "CS-AI", ParentID: stringPtr("dept-cs"), Level: "major", LeaderName: "周鹏", LeaderTitle: "研究员", StaffCount: 18},
		{ID: "dept-cs-sys", Name: "系统与架构研究室", Code: "CS-SYS", ParentID: stringPtr("dept-cs"), Level: "major", LeaderName: "何坤", LeaderTitle: "副教授", StaffCount: 12},
		{ID: "dept-se", Name: "软件工程", Code: "SE", ParentID: stringPtr("dept-ie"), Level: "major", LeaderName: "王芳", LeaderTitle: "教授", StaffCount: 96},
		{ID: "dept-se-cloud", Name: "云计算研究室", Code: "SE-CLOUD", ParentID: stringPtr("dept-se"), Level: "major", LeaderName: "吴刚", LeaderTitle: "讲师", StaffCount: 15},
		{ID: "dept-network", Name: "网络工程", Code: "NET", ParentID: stringPtr("dept-ie"), Level: "major", LeaderName: "张明", LeaderTitle: "教授", StaffCount: 56},
		{ID: "dept-review", Name: "学术评审部", Code: "REVIEW", ParentID: stringPtr("dept-root"), Level: "college", StaffCount: 28},
		{ID: "dept-outreach", Name: "全球外联部", Code: "OUTREACH", ParentID: stringPtr("dept-root"), Level: "college", StaffCount: 15},
		{ID: "dept-ethics", Name: "机构伦理部", Code: "ETHICS", ParentID: stringPtr("dept-root"), Level: "college", StaffCount: 12},
		{ID: "dept-editorial", Name: "编辑委员会", Code: "EDITORIAL", ParentID: stringPtr("dept-root"), Level: "college", StaffCount: 8},
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
	}
	return db.CreateInBatches(roles, 100).Error
}

func seedMenus(db *gorm.DB) error {
	menus := []model.Menu{
		{ID: "menu-dashboard", Name: "工作台", Path: "/dashboard", Icon: "DashboardOutlined", SortOrder: 1, Visible: true, Type: "menu"},
		{ID: "menu-dept", Name: "部门管理", Path: "/departments", Icon: "ApartmentOutlined", SortOrder: 2, Visible: true, Type: "menu"},
		{ID: "menu-role", Name: "角色管理", Path: "/roles", Icon: "TeamOutlined", SortOrder: 3, Visible: true, Type: "menu"},
		{ID: "menu-users", Name: "用户管理", Path: "/users", Icon: "UserOutlined", SortOrder: 4, Visible: true, Type: "menu"},
		{ID: "menu-positions", Name: "职位管理", Path: "/positions", Icon: "SolutionOutlined", SortOrder: 5, Visible: true, Type: "menu"},
		{ID: "menu-grade", Name: "职级管理", Path: "/grades", Icon: "BarChartOutlined", SortOrder: 6, Visible: true, Type: "menu"},
		{ID: "menu-menus", Name: "菜单管理", Path: "/menus", Icon: "MenuOutlined", SortOrder: 7, Visible: true, Type: "menu"},
		{ID: "menu-audit", Name: "审计日志", Path: "/audit-logs", Icon: "AuditOutlined", SortOrder: 10, Visible: true, Type: "menu"},

		// 部门管理按钮
		{ID: "menu-dept-add", Name: "新增部门", ParentID: stringPtr("menu-dept"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-dept-edit", Name: "编辑部门", ParentID: stringPtr("menu-dept"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-dept-delete", Name: "删除部门", ParentID: stringPtr("menu-dept"), SortOrder: 3, Visible: true, Type: "button"},

		// 用户管理按钮
		{ID: "menu-user-add", Name: "新增用户", ParentID: stringPtr("menu-users"), SortOrder: 1, Visible: true, Type: "button"},
		{ID: "menu-user-edit", Name: "编辑用户", ParentID: stringPtr("menu-users"), SortOrder: 2, Visible: true, Type: "button"},
		{ID: "menu-user-delete", Name: "删除用户", ParentID: stringPtr("menu-users"), SortOrder: 3, Visible: true, Type: "button"},
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
			DepartmentID: "dept-ie",
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
			DepartmentID: "dept-cs",
			AccessStatus: "full",
			IsActive:     true,
			UserType:     "staff",
			LoginID:      "lecturer001",
			PasswordHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36CHQa9C",
		},
		{
			ID:           "user-001",
			Name:         "Dr. Elena Rodriguez",
			Email:        "elena.rodriguez@seuu.edu",
			Initials:     stringPtr("ER"),
			DepartmentID: "dept-review",
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
		{RoleID: "role-president", MenuID: "menu-dept"},
		{RoleID: "role-president", MenuID: "menu-dept-add"},
		{RoleID: "role-president", MenuID: "menu-dept-edit"},
		{RoleID: "role-president", MenuID: "menu-dept-delete"},
		{RoleID: "role-president", MenuID: "menu-users"},
		{RoleID: "role-president", MenuID: "menu-user-add"},
		{RoleID: "role-president", MenuID: "menu-user-edit"},
		{RoleID: "role-president", MenuID: "menu-user-delete"},
		{RoleID: "role-president", MenuID: "menu-grade"},
		{RoleID: "role-president", MenuID: "menu-menus"},
		{RoleID: "role-president", MenuID: "menu-audit"},
		{RoleID: "role-dean", MenuID: "menu-dashboard"},
		{RoleID: "role-dean", MenuID: "menu-dept"},
		{RoleID: "role-dean", MenuID: "menu-users"},
		{RoleID: "role-lecturer", MenuID: "menu-dashboard"},
		{RoleID: "role-lecturer", MenuID: "menu-users"},
	}
	return db.CreateInBatches(roleMenus, 100).Error
}

func seedPositionCategories(db *gorm.DB) error {
	categories := []model.PositionCategory{
		{Code: "teaching", Name: "教学岗位", Color: "#FF6B6B", Icon: "BookOutlined", SortOrder: 1, Description: "负责教学工作的岗位"},
		{Code: "research", Name: "科研岗位", Color: "#4ECDC4", Icon: "ExperimentOutlined", SortOrder: 2, Description: "负责科研工作的岗位"},
		{Code: "admin", Name: "行政岗位", Color: "#45B7D1", Icon: "FileOutlined", SortOrder: 3, Description: "负责行政管理的岗位"},
		{Code: "support", Name: "辅助岗位", Color: "#96CEB4", Icon: "TeamOutlined", SortOrder: 4, Description: "提供支持服务的岗位"},
	}
	return db.CreateInBatches(categories, 100).Error
}

func seedPositions(db *gorm.DB) error {
	positions := []model.Position{
		{ID: "pos-001", Name: "教授", Code: "PROF", CategoryCode: "teaching", Level: 4, Description: "大学教授职位", Headcount: 45},
		{ID: "pos-002", Name: "副教授", Code: "ASSOC-PROF", CategoryCode: "teaching", Level: 3, Description: "大学副教授职位", Headcount: 78},
		{ID: "pos-003", Name: "讲师", Code: "LECTURER", CategoryCode: "teaching", Level: 2, Description: "大学讲师职位", Headcount: 156},
		{ID: "pos-006", Name: "院长", Code: "DEAN", CategoryCode: "admin", Level: 4, Description: "学院行政领导", Headcount: 12},
	}
	return db.CreateInBatches(positions, 100).Error
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

func seedUserPositions(db *gorm.DB) error {
	userPositions := []model.UserPosition{
		{UserID: "user-005", PositionID: "pos-006"},
		{UserID: "user-006", PositionID: "pos-006"},
		{UserID: "user-007", PositionID: "pos-002"},
	}
	return db.CreateInBatches(userPositions, 100).Error
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
