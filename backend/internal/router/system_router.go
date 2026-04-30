package router

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterSystemRoutes 注册系统管理相关路由（菜单、职级）
func RegisterSystemRoutes(v1 *gin.RouterGroup, c *app.Container) {
	menuHandler := handler.NewMenuHandler(c.MenuSvc)
	gradeHandler := handler.NewGradeHandler(c.GradeSvc)

	system := v1.Group("/system")
	system.Use(middleware.JWTMiddleware())
	{
		// 菜单管理
		menus := system.Group("/menus")
		{
			menus.GET("/tree", middleware.PermissionMiddleware("menu-menu"), menuHandler.GetTree)
			menus.GET("/user-menus", menuHandler.GetUserMenus)
			menus.POST("", middleware.PermissionMiddleware("menu-menu-add"), menuHandler.Create)
			menus.PUT("/:id", middleware.PermissionMiddleware("menu-menu-edit"), menuHandler.Update)
			menus.DELETE("/:id", middleware.PermissionMiddleware("menu-menu-delete"), menuHandler.Delete)
		}

		// 职级管理
		grades := system.Group("/grades")
		{
			grades.GET("", middleware.PermissionMiddleware("menu-grade"), gradeHandler.List)
			grades.POST("", middleware.PermissionMiddleware("menu-grade"), gradeHandler.Create)
		}
	}
}
