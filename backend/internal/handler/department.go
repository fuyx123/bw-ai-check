package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type DepartmentHandler struct{}

func NewDepartmentHandler() *DepartmentHandler {
	return &DepartmentHandler{}
}

func (h *DepartmentHandler) GetTree(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement department tree", nil)
}

func (h *DepartmentHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement department list", nil)
}

func (h *DepartmentHandler) GetDetail(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement get department detail", nil)
}

func (h *DepartmentHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement create department", nil)
}

func (h *DepartmentHandler) Update(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement update department", nil)
}

func (h *DepartmentHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement delete department", nil)
}
