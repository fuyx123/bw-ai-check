package router

import (
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

// SetupRoutes 注册所有路由 - 路由装配主入口
func SetupRoutes(engine *gin.Engine, c *app.Container) {
	cfg := c.Config
	logger := c.Logger

	// 全局中间件
	engine.Use(middleware.CORS(cfg.CORS.AllowOrigins))
	engine.Use(middleware.RequestLogger(logger))

	// /api/v1 API 分组
	v1 := engine.Group("/api/v1")

	// 注册各业务模块的路由
	RegisterAuthRoutes(v1, c)     // 认证模块
	RegisterIAMRoutes(v1, c)      // 身份和权限管理模块
	RegisterOrgRoutes(v1, c)      // 组织管理模块
	RegisterSystemRoutes(v1, c)   // 系统管理模块
	RegisterAuditRoutes(v1, c)    // 审计模块
	RegisterExamRoutes(v1, c)     // 阅卷管理模块
	RegisterHomeworkRoutes(v1, c) // 作业审批模块
	RegisterCycleRoutes(v1, c)    // 教学周期管理模块
	RegisterModelRoutes(v1, c)    // 大模型管理模块

	// 健康检查（公开端点）
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "healthy",
		})
	})
}
