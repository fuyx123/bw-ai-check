package router

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/handler"
	"bw-ai-check/backend/internal/middleware"
)

// RegisterAuthRoutes 注册认证相关路由
func RegisterAuthRoutes(v1 *gin.RouterGroup, c *app.Container) {
	authHandler := handler.NewAuthHandler(c.AuthSvc)

	auth := v1.Group("/auth")
	{
		// 登录（公开）
		auth.POST("/login", authHandler.Login)

		// 登出（需认证）
		auth.POST("/logout", middleware.JWTMiddleware(), authHandler.Logout)

		// 获取当前用户信息（需认证）
		auth.GET("/me", middleware.JWTMiddleware(), authHandler.Me)
	}
}
