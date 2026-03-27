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
			menus.GET("/tree", menuHandler.GetTree)
			menus.GET("/user-menus", menuHandler.GetUserMenus)
			menus.POST("", middleware.PermissionMiddleware("menu-menus"), menuHandler.Create)
			menus.PUT("/:id", middleware.PermissionMiddleware("menu-menus"), menuHandler.Update)
			menus.DELETE("/:id", middleware.PermissionMiddleware("menu-menus"), menuHandler.Delete)
		}

		// 岗位管理
		positions := system.Group("/positions")
		{
			positions.GET("", middleware.PermissionMiddleware("menu-positions"), positionHandler.ListPositions)
			positions.POST("", middleware.PermissionMiddleware("menu-positions"), positionHandler.CreatePosition)
			positions.PUT("/:id", middleware.PermissionMiddleware("menu-positions"), positionHandler.UpdatePosition)
			positions.DELETE("/:id", middleware.PermissionMiddleware("menu-positions"), positionHandler.DeletePosition)
		}

		// 岗位分类
		positionCategories := system.Group("/position-categories")
		{
			positionCategories.GET("", positionHandler.ListCategories)
			positionCategories.POST("", middleware.PermissionMiddleware("menu-positions"), positionHandler.CreateCategory)
			positionCategories.PUT("/:code", middleware.PermissionMiddleware("menu-positions"), positionHandler.UpdateCategory)
			positionCategories.DELETE("/:code", middleware.PermissionMiddleware("menu-positions"), positionHandler.DeleteCategory)
		}

		// 职级管理
		grades := system.Group("/grades")
		{
			grades.GET("", middleware.PermissionMiddleware("menu-grades"), gradeHandler.List)
			grades.POST("", middleware.PermissionMiddleware("menu-grades"), gradeHandler.Create)
		}
	}
}
