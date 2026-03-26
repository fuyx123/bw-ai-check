package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type DepartmentHandler struct {
	svc *service.DepartmentService
}

func NewDepartmentHandler(svc *service.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{svc: svc}
}

func (h *DepartmentHandler) GetTree(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *DepartmentHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *DepartmentHandler) GetDetail(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *DepartmentHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *DepartmentHandler) Update(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *DepartmentHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}
