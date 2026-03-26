package router

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"bw-ai-check/backend/config"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
	"bw-ai-check/backend/internal/service"
)

// SetupRoutes 注册所有路由
func SetupRoutes(engine *gin.Engine, db *gorm.DB) {
	cfg := config.Get()

	// CORS 中间件
	engine.Use(middleware.CORS(cfg.CORS.AllowOrigins))

	// ========== 初始化服务层 ==========
	authSvc := service.NewAuthService(db)
	deptSvc := service.NewDepartmentService(db)
	userSvc := service.NewUserService(db)
	roleSvc := service.NewRoleService(db)
	menuSvc := service.NewMenuService(db)
	positionSvc := service.NewPositionService(db)
	gradeSvc := service.NewGradeService(db)
	auditSvc := service.NewAuditLogService(db)

	// ========== 初始化处理器层 ==========
	authHandler := handler.NewAuthHandler(authSvc)
	deptHandler := handler.NewDepartmentHandler(deptSvc)
	userHandler := handler.NewUserHandler(userSvc)
	roleHandler := handler.NewRoleHandler(roleSvc)
	menuHandler := handler.NewMenuHandler(menuSvc)
	positionHandler := handler.NewPositionHandler(positionSvc)
	gradeHandler := handler.NewGradeHandler(gradeSvc)
	auditHandler := handler.NewAuditLogHandler(auditSvc)

	// ========== 路由注册 ==========

	// 无需认证的路由
	api := engine.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", middleware.JWTMiddleware(), authHandler.Me)
		}
	}

	// 需要认证的路由
	protected := api.Group("")
	protected.Use(middleware.JWTMiddleware())
	{
		// 部门管理
		dept := protected.Group("/departments")
		{
			dept.GET("/tree", middleware.PermissionMiddleware("menu-dept"), deptHandler.GetTree)
			dept.GET("", middleware.PermissionMiddleware("menu-dept"), deptHandler.List)
			dept.GET("/:id", middleware.PermissionMiddleware("menu-dept"), deptHandler.GetDetail)
			dept.POST("", middleware.PermissionMiddleware("menu-dept"), deptHandler.Create)
			dept.PUT("/:id", middleware.PermissionMiddleware("menu-dept"), deptHandler.Update)
			dept.DELETE("/:id", middleware.PermissionMiddleware("menu-dept"), deptHandler.Delete)
		}

		// 用户管理
		user := protected.Group("/users")
		{
			user.GET("", middleware.PermissionMiddleware("menu-users"), userHandler.List)
			user.GET("/:id", middleware.PermissionMiddleware("menu-users"), userHandler.GetDetail)
			user.POST("", middleware.PermissionMiddleware("menu-users"), userHandler.Create)
			user.PUT("/:id", middleware.PermissionMiddleware("menu-users"), userHandler.Update)
			user.DELETE("/:id", middleware.PermissionMiddleware("menu-users"), userHandler.Delete)
			user.PATCH("/:id/status", middleware.PermissionMiddleware("menu-users"), userHandler.ToggleStatus)
		}

		// 角色管理
		role := protected.Group("/roles")
		{
			role.GET("", middleware.PermissionMiddleware("menu-roles"), roleHandler.List)
			role.GET("/:id/menus", middleware.PermissionMiddleware("menu-roles"), roleHandler.GetWithMenus)
			role.POST("", middleware.PermissionMiddleware("menu-roles"), roleHandler.Create)
			role.PUT("/:id/menus", middleware.PermissionMiddleware("menu-roles"), roleHandler.UpdateMenus)
			role.DELETE("/:id", middleware.PermissionMiddleware("menu-roles"), roleHandler.Delete)
		}

		// 菜单管理
		menu := protected.Group("/menus")
		{
			menu.GET("/tree", menuHandler.GetTree)
			menu.GET("/user-menus", menuHandler.GetUserMenus)
			menu.POST("", middleware.PermissionMiddleware("menu-menus"), menuHandler.Create)
			menu.PUT("/:id", middleware.PermissionMiddleware("menu-menus"), menuHandler.Update)
			menu.DELETE("/:id", middleware.PermissionMiddleware("menu-menus"), menuHandler.Delete)
		}

		// 岗位管理
		pos := protected.Group("/positions")
		{
			pos.GET("", middleware.PermissionMiddleware("menu-positions"), positionHandler.ListPositions)
			pos.POST("", middleware.PermissionMiddleware("menu-positions"), positionHandler.CreatePosition)
			pos.PUT("/:id", middleware.PermissionMiddleware("menu-positions"), positionHandler.UpdatePosition)
			pos.DELETE("/:id", middleware.PermissionMiddleware("menu-positions"), positionHandler.DeletePosition)
		}

		poscat := protected.Group("/position-categories")
		{
			poscat.GET("", positionHandler.ListCategories)
		}

		// 职级管理
		grade := protected.Group("/grades")
		{
			grade.GET("", middleware.PermissionMiddleware("menu-grades"), gradeHandler.List)
			grade.POST("", middleware.PermissionMiddleware("menu-grades"), gradeHandler.Create)
		}

		// 审计日志
		audit := protected.Group("/audit-logs")
		{
			audit.GET("", middleware.PermissionMiddleware("menu-audit"), auditHandler.List)
		}
	}

	// 健康检查
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})
}
