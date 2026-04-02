package router

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterExamRoutes 注册阅卷管理路由
func RegisterExamRoutes(v1 *gin.RouterGroup, c *app.Container) {
	h := handler.NewExamHandler(c.ExamSvc, c.ExamGraderSvc)

	exam := v1.Group("/exam")
	exam.Use(middleware.JWTMiddleware())
	{
		// 获取当前用户可访问的班级列表（用于筛选器）
		exam.GET("/classes", middleware.PermissionMiddleware("menu-exam"), h.ListClasses)

		papers := exam.Group("/papers")
		{
			papers.GET("", middleware.PermissionMiddleware("menu-exam"), h.List)
			papers.POST("/upload", middleware.PermissionMiddleware("menu-exam-upload"), h.Upload)
			papers.POST("/batch-upload", middleware.PermissionMiddleware("menu-exam-batch"), h.BatchUpload)
			papers.GET("/:id/file", middleware.PermissionMiddleware("menu-exam"), h.Download)
			papers.GET("/:id/preview-docx", middleware.PermissionMiddleware("menu-exam"), h.PreviewDocx)
			papers.DELETE("/:id", middleware.PermissionMiddleware("menu-exam-delete"), h.Delete)

			// 阅卷明细与复阅
			papers.GET("/:id/grading", middleware.PermissionMiddleware("menu-exam"), h.GetGradingDetail)
			papers.POST("/:id/review", middleware.PermissionMiddleware("menu-exam"), h.SubmitManualReview)
		}

		// 阅卷老师分配（周考/月考）
		sessions := exam.Group("/sessions")
		{
			sessions.GET("/:sessionId/graders", middleware.PermissionMiddleware("menu-exam"), h.ListSessionGraders)
			sessions.POST("/:sessionId/graders", middleware.PermissionMiddleware("menu-exam"), h.UpsertSessionGrader)
			sessions.DELETE("/graders/:id", middleware.PermissionMiddleware("menu-exam"), h.DeleteSessionGrader)
		}
	}
}
