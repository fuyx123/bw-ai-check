package router

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterOrgRoutes 注册组织管理相关路由（部门）
func RegisterOrgRoutes(v1 *gin.RouterGroup, c *app.Container) {
	deptHandler := handler.NewDepartmentHandler(c.DeptSvc)

	org := v1.Group("/org")
	org.Use(middleware.JWTMiddleware())
	{
		// 部门管理
		departments := org.Group("/departments")
		{
			departments.GET("/tree", middleware.PermissionMiddleware("menu-dept"), deptHandler.GetTree)
			departments.GET("", middleware.PermissionMiddleware("menu-dept"), deptHandler.List)
			departments.GET("/:id", middleware.PermissionMiddleware("menu-dept"), deptHandler.GetDetail)
			departments.POST("", middleware.PermissionMiddleware("menu-dept-add"), deptHandler.Create)
			departments.PUT("/:id", middleware.PermissionMiddleware("menu-dept-edit"), deptHandler.Update)
			departments.DELETE("/:id", middleware.PermissionMiddleware("menu-dept-delete"), deptHandler.Delete)
		}
	}
}
