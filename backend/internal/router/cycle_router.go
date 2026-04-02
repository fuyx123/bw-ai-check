package router

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterCycleRoutes 注册教学周期路由
func RegisterCycleRoutes(v1 *gin.RouterGroup, c *app.Container) {
	h := handler.NewCycleHandler(c.CycleSvc)

	cycles := v1.Group("/cycles")
	cycles.Use(middleware.JWTMiddleware())
	{
		cycles.GET("", middleware.PermissionMiddleware("menu-cycle"), h.ListCycles)
		cycles.POST("", middleware.PermissionMiddleware("menu-cycle-manage"), h.CreateCycle)
		cycles.GET("/:id", middleware.PermissionMiddleware("menu-cycle"), h.GetCycle)
		cycles.DELETE("/:id", middleware.PermissionMiddleware("menu-cycle-manage"), h.DeleteCycle)
		cycles.POST("/:id/import", middleware.PermissionMiddleware("menu-cycle-manage"), h.ImportSchedule)
	}
}
