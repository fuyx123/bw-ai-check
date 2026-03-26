package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type GradeHandler struct{}

func NewGradeHandler() *GradeHandler {
	return &GradeHandler{}
}

func (h *GradeHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement grade list", nil)
}

func (h *GradeHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement create grade", nil)
}
