package router

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterModelRoutes 注册大模型管理路由
func RegisterModelRoutes(v1 *gin.RouterGroup, c *app.Container) {
	h := handler.NewAIModelHandler(c.ModelSvc)

	models := v1.Group("/models")
	models.Use(middleware.JWTMiddleware())
	{
		models.GET("",           middleware.PermissionMiddleware("menu-model"), h.List)
		models.POST("",          middleware.PermissionMiddleware("menu-model"), h.Create)
		models.PUT("/:id",       middleware.PermissionMiddleware("menu-model"), h.Update)
		models.DELETE("/:id",    middleware.PermissionMiddleware("menu-model"), h.Delete)
		models.PUT("/:id/enable",  middleware.PermissionMiddleware("menu-model"), h.Enable)
		models.PUT("/:id/disable", middleware.PermissionMiddleware("menu-model"), h.Disable)
	}
}
