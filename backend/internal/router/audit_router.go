package router

import (
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
	"github.com/gin-gonic/gin"
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
			logs.GET("", middleware.PermissionMiddleware("menu-audit"), auditHandler.List)
		}
	}
}
