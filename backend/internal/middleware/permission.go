package middleware

import (
	"bw-ai-check/backend/pkg/database"
	"bw-ai-check/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

var permissionAliases = map[string][]string{
	"menu-users":  {"menu-users", "menu-user"},
	"menu-roles":  {"menu-roles", "menu-role"},
	"menu-menus":  {"menu-menus", "menu-menu"},
	"menu-grades": {"menu-grades", "menu-grade"},

	// 动作级权限回退到基础权限：确保动作路由在数据库未配齐 add/edit/delete 时仍可工作。
	"menu-menu-add":    {"menu-menu-add", "menu-menu"},
	"menu-menu-edit":   {"menu-menu-edit", "menu-menu"},
	"menu-menu-delete": {"menu-menu-delete", "menu-menu"},

	"menu-user-add":    {"menu-user-add", "menu-user"},
	"menu-user-edit":   {"menu-user-edit", "menu-user"},
	"menu-user-delete": {"menu-user-delete", "menu-user"},

	"menu-role-add":    {"menu-role-add", "menu-role"},
	"menu-role-edit":   {"menu-role-edit", "menu-role"},
	"menu-role-delete": {"menu-role-delete", "menu-role"},

	"menu-dept-add":    {"menu-dept-add", "menu-dept"},
	"menu-dept-edit":   {"menu-dept-edit", "menu-dept"},
	"menu-dept-delete": {"menu-dept-delete", "menu-dept"},

	// 阅卷管理动作级权限回退
	"menu-exam-upload": {"menu-exam-upload", "menu-exam"},
	"menu-exam-batch":  {"menu-exam-batch", "menu-exam"},
	"menu-exam-delete": {"menu-exam-delete", "menu-exam"},

	// 教学周期管理权限回退
	"menu-cycle-manage": {"menu-cycle-manage", "menu-cycle"},

	// 模型管理权限回退
	"menu-model": {"menu-model"},
}

func permissionCandidates(requiredMenuID string) []string {
	if aliases, ok := permissionAliases[requiredMenuID]; ok {
		return aliases
	}
	return []string{requiredMenuID}
}

// PermissionMiddleware 权限检查中间件（根据 menuID 检查）
func PermissionMiddleware(requiredMenuID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			response.Fail(c, response.CodeAuthFailed, "no authentication")
			c.Abort()
			return
		}

		candidates := permissionCandidates(requiredMenuID)

		// 支持多角色：通过 user_id 查询用户全部 role_id，再聚合 role_menus。
		var roleIDs []string
		if err := database.DB.Table("user_roles").
			Where("user_id = ?", claims.UserID).
			Pluck("role_id", &roleIDs).Error; err != nil {
			response.Fail(c, response.CodeOperationFail, "failed to check permission")
			c.Abort()
			return
		}

		if len(roleIDs) == 0 {
			response.Fail(c, response.CodePermissionDeny, "no permission to access this resource")
			c.Abort()
			return
		}

		var count int64
		if err := database.DB.Table("role_menus").
			Where("role_id IN ? AND menu_id IN ?", roleIDs, candidates).
			Count(&count).Error; err != nil {
			response.Fail(c, response.CodeOperationFail, "failed to check permission")
			c.Abort()
			return
		}

		if count == 0 {
			response.Fail(c, response.CodePermissionDeny, "no permission to access this resource")
			c.Abort()
			return
		}

		c.Next()
	}
}

// HasPermission 检查是否有某个权限
func HasPermission(c *gin.Context, menuID string) bool {
	claims := GetClaims(c)
	if claims == nil {
		return false
	}

	candidates := permissionCandidates(menuID)

	var roleIDs []string
	if err := database.DB.Table("user_roles").
		Where("user_id = ?", claims.UserID).
		Pluck("role_id", &roleIDs).Error; err != nil {
		return false
	}

	if len(roleIDs) == 0 {
		return false
	}

	var count int64
	if err := database.DB.Table("role_menus").
		Where("role_id IN ? AND menu_id IN ?", roleIDs, candidates).
		Count(&count).Error; err != nil {
		return false
	}

	return count > 0
}
