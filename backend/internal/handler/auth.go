package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type AuthHandler struct{}

// NewAuthHandler 创建认证处理器
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

// Login 登录
func (h *AuthHandler) Login(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement login", nil)
}

// Logout 登出
func (h *AuthHandler) Logout(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement logout", nil)
}

// Me 获取当前用户信息
func (h *AuthHandler) Me(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement get current user", nil)
}
