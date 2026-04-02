package router

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterSystemRoutes 注册系统管理相关路由（菜单、岗位、职级）
func RegisterSystemRoutes(v1 *gin.RouterGroup, c *app.Container) {
	menuHandler := handler.NewMenuHandler(c.MenuSvc)
	positionHandler := handler.NewPositionHandler(c.PosSvc)
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

		// 岗位管理
		positions := system.Group("/positions")
		{
			positions.GET("", middleware.PermissionMiddleware("menu-position"), positionHandler.ListPositions)
			positions.POST("", middleware.PermissionMiddleware("menu-pos-add"), positionHandler.CreatePosition)
			positions.PUT("/:id", middleware.PermissionMiddleware("menu-pos-edit"), positionHandler.UpdatePosition)
			positions.DELETE("/:id", middleware.PermissionMiddleware("menu-pos-delete"), positionHandler.DeletePosition)
		}

		// 岗位分类
		positionCategories := system.Group("/position-categories")
		{
			positionCategories.GET("", middleware.PermissionMiddleware("menu-position"), positionHandler.ListCategories)
			positionCategories.POST("", middleware.PermissionMiddleware("menu-pos-add"), positionHandler.CreateCategory)
			positionCategories.PUT("/:code", middleware.PermissionMiddleware("menu-pos-edit"), positionHandler.UpdateCategory)
			positionCategories.DELETE("/:code", middleware.PermissionMiddleware("menu-pos-delete"), positionHandler.DeleteCategory)
		}

		// 职级管理
		grades := system.Group("/grades")
		{
			grades.GET("", middleware.PermissionMiddleware("menu-grade"), gradeHandler.List)
			grades.POST("", middleware.PermissionMiddleware("menu-grade"), gradeHandler.Create)
		}
	}
}
