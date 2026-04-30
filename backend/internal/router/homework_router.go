package router

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterHomeworkRoutes 注册作业审批路由
func RegisterHomeworkRoutes(v1 *gin.RouterGroup, c *app.Container) {
	h := handler.NewHomeworkHandler(c.HomeworkSvc)

	homework := v1.Group("/homework")
	homework.Use(middleware.JWTMiddleware())
	{
		homework.GET("/classes", middleware.PermissionMiddleware("menu-homework-approval"), h.ListClasses)
		homework.GET("/missing", middleware.PermissionMiddleware("menu-homework-approval"), h.ListMissing)
		homework.GET("/report", middleware.PermissionMiddleware("menu-homework-approval"), h.GetReport)

		submissions := homework.Group("/submissions")
		{
			submissions.GET("/my", middleware.PermissionMiddleware("menu-homework-approval"), h.ListMySubmissions)
			submissions.GET("", middleware.PermissionMiddleware("menu-homework-approval"), h.ListSubmissions)
			submissions.POST("/upload", middleware.PermissionMiddleware("menu-homework-approval"), h.UploadSubmission)
			submissions.GET("/:id", middleware.PermissionMiddleware("menu-homework-approval"), h.GetSubmissionDetail)
		}
	}
}
