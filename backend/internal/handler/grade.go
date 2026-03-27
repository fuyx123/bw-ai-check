package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type GradeHandler struct {
	svc *service.GradeService
}

func NewGradeHandler(svc *service.GradeService) *GradeHandler {
	return &GradeHandler{svc: svc}
}

func (h *GradeHandler) List(c *gin.Context) {
	grades, err := h.svc.List()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, grades)
}

func (h *GradeHandler) Create(c *gin.Context) {
	var req dto.CreateGradeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	grade, err := h.svc.Create(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, grade)
}
