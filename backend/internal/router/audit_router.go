package router

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterAuditRoutes 注册审计相关路由（审计日志）
func RegisterAuditRoutes(v1 *gin.RouterGroup, c *app.Container) {
	auditHandler := handler.NewAuditLogHandler(c.AuditSvc)

	audit := v1.Group("/audit")
	audit.Use(middleware.JWTMiddleware())
	{
		// 审计日志
		logs := audit.Group("/logs")
		{
			// 由于 menus/role_menus 中当前未看到 menu-audit，该审计接口使用 dashboard 作为读取权限兜底
			logs.GET("", middleware.PermissionMiddleware("menu-dashboard"), auditHandler.List)
		}
	}
}
