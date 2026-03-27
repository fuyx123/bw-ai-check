package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
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
	depts, err := h.svc.GetTree(accessContext(c))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, depts)
}

func (h *DepartmentHandler) List(c *gin.Context) {
	page, pageSize := paginationFromQuery(c)
	level := c.Query("level")
	keyword := c.Query("keyword")

	depts, total, err := h.svc.List(accessContext(c), page, pageSize, level, keyword)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.PageOK(c, depts, total, page, pageSize)
}

func (h *DepartmentHandler) GetDetail(c *gin.Context) {
	dept, err := h.svc.GetDetail(accessContext(c), c.Param("id"))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, dept)
}

func (h *DepartmentHandler) Create(c *gin.Context) {
	var req dto.CreateDeptReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	dept, err := h.svc.Create(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, dept)
}

func (h *DepartmentHandler) Update(c *gin.Context) {
	var req dto.UpdateDeptReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	dept, err := h.svc.Update(accessContext(c), c.Param("id"), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, dept)
}

func (h *DepartmentHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(accessContext(c), c.Param("id")); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}
