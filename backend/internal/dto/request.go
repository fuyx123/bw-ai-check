package dto

// ========== Auth Requests ==========

// LoginReq 登录请求
type LoginReq struct {
	LoginID  string `json:"loginId" binding:"required"`
	Password string `json:"password" binding:"required"`
	UserType string `json:"userType" binding:"required,oneof=staff student"`
}

// ========== User Requests ==========

// UserFilter 用户列表筛选条件
type UserFilter struct {
	Keyword      string `form:"keyword"`
	UserType     string `form:"userType"`
	DepartmentID string `form:"departmentId"`
	RoleID       string `form:"roleId"`
}

// CreateUserReq 创建用户请求
type CreateUserReq struct {
	Name         string   `json:"name" binding:"required"`
	Email        string   `json:"email" binding:"required,email"`
	LoginID      string   `json:"loginId" binding:"required"`
	Password     string   `json:"password" binding:"required,min=6"`
	UserType     string   `json:"userType" binding:"required,oneof=staff student"`
	DepartmentID string   `json:"departmentId" binding:"required"`
	RoleIds      []string `json:"roleIds"`
	AccessStatus string   `json:"accessStatus" binding:"required,oneof=full partial inactive"`
	IsActive     bool     `json:"isActive"`
	Avatar       *string  `json:"avatar"`
	Grade        *string  `json:"grade"`     // student only
	ClassName    *string  `json:"className"` // student only
	ClassID      *string  `json:"classId"`   // student only
}

// UpdateUserReq 更新用户请求
type UpdateUserReq struct {
	Name         *string   `json:"name"`
	Email        *string   `json:"email" binding:"omitempty,email"`
	DepartmentID *string   `json:"departmentId"`
	RoleIds      *[]string `json:"roleIds"`
	AccessStatus *string   `json:"accessStatus" binding:"omitempty,oneof=full partial inactive"`
	IsActive     *bool     `json:"isActive"`
	Avatar       *string   `json:"avatar"`
	Grade        *string   `json:"grade"`
	ClassName    *string   `json:"className"`
	ClassID      *string   `json:"classId"`
}

// ToggleStatusReq 切换用户状态请求
type ToggleStatusReq struct {
	IsActive bool `json:"isActive"`
}

// ResetPasswordReq 重置密码请求
type ResetPasswordReq struct {
	NewPassword string `json:"newPassword" binding:"required,min=6"`
}

// ========== Department Requests ==========

// CreateDeptReq 创建部门请求
type CreateDeptReq struct {
	Name         string  `json:"name" binding:"required"`
	Code         string  `json:"code" binding:"required"`
	ParentID     *string `json:"parentId"`
	Level        string  `json:"level" binding:"required"`
	LeaderName   string  `json:"leaderName"`
	LeaderTitle  string  `json:"leaderTitle"`
	LeaderAvatar *string `json:"leaderAvatar"`
	StaffCount   int     `json:"staffCount"`
}

// UpdateDeptReq 更新部门请求
type UpdateDeptReq struct {
	Name         *string `json:"name"`
	Code         *string `json:"code"`
	Level        *string `json:"level"`
	LeaderName   *string `json:"leaderName"`
	LeaderTitle  *string `json:"leaderTitle"`
	LeaderAvatar *string `json:"leaderAvatar"`
	StaffCount   *int    `json:"staffCount"`
}

// ========== Role Requests ==========

// CreateRoleReq 创建角色请求
type CreateRoleReq struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	DataScope   string `json:"dataScope" binding:"required,oneof=school college major class personal"`
}

// UpdateRoleReq 更新角色基础信息
type UpdateRoleReq struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	DataScope   *string `json:"dataScope" binding:"omitempty,oneof=school college major class personal"`
}

// UpdateRoleMenusReq 更新角色菜单请求
type UpdateRoleMenusReq struct {
	MenuIds []string `json:"menuIds" binding:"required"`
}

// ========== Menu Requests ==========

// CreateMenuReq 创建菜单请求
type CreateMenuReq struct {
	Name      string  `json:"name" binding:"required"`
	Path      string  `json:"path" binding:"required"`
	Icon      string  `json:"icon"`
	ParentID  *string `json:"parentId"`
	SortOrder int     `json:"sortOrder"`
	Visible   bool    `json:"visible"`
	Type      string  `json:"type" binding:"required,oneof=menu button"`
}

// UpdateMenuReq 更新菜单请求
type UpdateMenuReq struct {
	Name      *string `json:"name"`
	Path      *string `json:"path"`
	Icon      *string `json:"icon"`
	ParentID  *string `json:"parentId"`
	SortOrder *int    `json:"sortOrder"`
	Visible   *bool   `json:"visible"`
	Type      *string `json:"type"`
}

// ========== Grade Requests ==========

// CreateGradeReq 创建职级请求
type CreateGradeReq struct {
	Code  string `json:"code" binding:"required"`
	Name  string `json:"name" binding:"required"`
	Level int    `json:"level" binding:"required"`
}

// ========== Pagination ==========

// Pagination 分页参数
type Pagination struct {
	Page     int `form:"page" binding:"omitempty,min=1"`
	PageSize int `form:"pageSize" binding:"omitempty,min=1,max=100"`
}
