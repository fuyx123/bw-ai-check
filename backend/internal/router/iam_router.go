package router

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterIAMRoutes 注册身份和权限管理相关路由（用户、角色）
func RegisterIAMRoutes(v1 *gin.RouterGroup, c *app.Container) {
	userHandler := handler.NewUserHandler(c.UserSvc)
	roleHandler := handler.NewRoleHandler(c.RoleSvc)

	iam := v1.Group("/iam")
	iam.Use(middleware.JWTMiddleware())
	{
		// 用户管理
		users := iam.Group("/users")
		{
			users.GET("", middleware.PermissionMiddleware("menu-users"), userHandler.List)
			users.GET("/:id", middleware.PermissionMiddleware("menu-users"), userHandler.GetDetail)
			users.POST("", middleware.PermissionMiddleware("menu-users"), userHandler.Create)
			users.PUT("/:id", middleware.PermissionMiddleware("menu-users"), userHandler.Update)
			users.DELETE("/:id", middleware.PermissionMiddleware("menu-users"), userHandler.Delete)
			users.PATCH("/:id/status", middleware.PermissionMiddleware("menu-users"), userHandler.ToggleStatus)
		}

		// 角色管理
		roles := iam.Group("/roles")
		{
			roles.GET("", middleware.PermissionMiddleware("menu-roles"), roleHandler.List)
			roles.GET("/:id/menus", middleware.PermissionMiddleware("menu-roles"), roleHandler.GetWithMenus)
			roles.POST("", middleware.PermissionMiddleware("menu-roles"), roleHandler.Create)
			roles.PUT("/:id", middleware.PermissionMiddleware("menu-roles"), roleHandler.Update)
			roles.PUT("/:id/menus", middleware.PermissionMiddleware("menu-roles"), roleHandler.UpdateMenus)
			roles.DELETE("/:id", middleware.PermissionMiddleware("menu-roles"), roleHandler.Delete)
		}
	}
}
