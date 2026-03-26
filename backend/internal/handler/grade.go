package handler

import (
	"github.com/gin-gonic/gin"
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
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *GradeHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}
