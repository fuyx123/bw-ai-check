package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type RoleHandler struct {
	svc *service.RoleService
}

func NewRoleHandler(svc *service.RoleService) *RoleHandler {
	return &RoleHandler{svc: svc}
}

func (h *RoleHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *RoleHandler) GetWithMenus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *RoleHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *RoleHandler) UpdateMenus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *RoleHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}
