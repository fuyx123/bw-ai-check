package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type MenuHandler struct {
	svc *service.MenuService
}

func NewMenuHandler(svc *service.MenuService) *MenuHandler {
	return &MenuHandler{svc: svc}
}

func (h *MenuHandler) GetTree(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *MenuHandler) GetUserMenus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *MenuHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *MenuHandler) Update(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *MenuHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}
