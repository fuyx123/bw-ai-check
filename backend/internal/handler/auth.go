package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/middleware"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type AuthHandler struct {
	svc *service.AuthService
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// Login 用户登录
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	result, err := h.svc.Login(req)
	if err != nil {
		response.Fail(c, response.CodeAuthFailed, err.Error())
		return
	}

	response.OKWithData(c, result)
}

// Logout 用户登出
// 注：实际登出可由前端删除 token 实现，服务端可选实现 token 黑名单
func (h *AuthHandler) Logout(c *gin.Context) {
	// 如果需要 token 黑名单，可在此实现
	response.OK(c)
}

// Me 获取当前用户信息
func (h *AuthHandler) Me(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == "" {
		response.Fail(c, response.CodeAuthFailed, "missing user id")
		return
	}

	user, err := h.svc.GetMe(userID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	response.OKWithData(c, user)
}
