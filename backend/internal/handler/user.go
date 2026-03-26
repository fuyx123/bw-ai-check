package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *UserHandler) GetDetail(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *UserHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *UserHandler) Update(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *UserHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *UserHandler) ToggleStatus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}
