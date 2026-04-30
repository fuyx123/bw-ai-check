package router

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterCycleRoutes 注册教学周期路由
func RegisterCycleRoutes(v1 *gin.RouterGroup, c *app.Container) {
	h := handler.NewCycleHandler(c.CycleSvc, c.UserSvc, c.ExamGraderSvc)

	cycles := v1.Group("/cycles")
	cycles.Use(middleware.JWTMiddleware())
	{
		cycles.GET("", middleware.PermissionMiddleware("menu-cycle"), h.ListCycles)
		cycles.POST("", middleware.PermissionMiddleware("menu-cycle-manage"), h.CreateCycle)
		cycles.GET("/staff", middleware.PermissionMiddleware("menu-cycle-manage"), h.ListStaff)
		cycles.GET("/sessions/:sessionId/graders", middleware.PermissionMiddleware("menu-cycle-manage"), h.ListSessionGraders)
		cycles.POST("/sessions/:sessionId/graders", middleware.PermissionMiddleware("menu-cycle-manage"), h.UpsertSessionGrader)
		cycles.DELETE("/sessions/graders/:id", middleware.PermissionMiddleware("menu-cycle-manage"), h.DeleteSessionGrader)
		cycles.GET("/:id", middleware.PermissionMiddleware("menu-cycle"), h.GetCycle)
		cycles.DELETE("/:id", middleware.PermissionMiddleware("menu-cycle-manage"), h.DeleteCycle)
		cycles.POST("/:id/import", middleware.PermissionMiddleware("menu-cycle-manage"), h.ImportSchedule)
	}
}
