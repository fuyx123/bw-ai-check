package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type UserHandler struct{}

// NewUserHandler 创建用户处理器
func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// List 用户列表
func (h *UserHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement user list", nil)
}

// GetDetail 获取用户详情
func (h *UserHandler) GetDetail(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement get user detail", nil)
}

// Create 创建用户
func (h *UserHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement create user", nil)
}

// Update 更新用户
func (h *UserHandler) Update(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement update user", nil)
}

// Delete 删除用户
func (h *UserHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement delete user", nil)
}

// ToggleStatus 切换用户激活状态
func (h *UserHandler) ToggleStatus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement toggle user status", nil)
}
