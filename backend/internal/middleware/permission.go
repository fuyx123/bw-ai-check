package middleware

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/database"
	"bw-ai-check/backend/pkg/response"
	"bw-ai-check/backend/internal/model"
)

// PermissionMiddleware 权限检查中间件（根据 menuID 检查）
func PermissionMiddleware(requiredMenuID string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims := GetClaims(c)
		if claims == nil {
			response.Fail(c, response.CodeAuthFailed, "no authentication")
			c.Abort()
			return
		}

		// 查询用户角色的菜单权限
		var roleMenus []model.RoleMenu
		if err := database.DB.Where("role_id = ?", claims.RoleID).Find(&roleMenus).Error; err != nil {
			response.Fail(c, response.CodeOperationFail, "failed to check permission")
			c.Abort()
			return
		}

		// 检查是否有该菜单权限
		hasPermission := false
		for _, rm := range roleMenus {
			if rm.MenuID == requiredMenuID {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
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

	var roleMenus []model.RoleMenu
	if err := database.DB.Where("role_id = ?", claims.RoleID).Find(&roleMenus).Error; err != nil {
		return false
	}

	for _, rm := range roleMenus {
		if rm.MenuID == menuID {
			return true
		}
	}

	return false
}
