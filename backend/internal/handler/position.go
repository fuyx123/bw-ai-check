package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type PositionHandler struct {
	svc *service.PositionService
}

func NewPositionHandler(svc *service.PositionService) *PositionHandler {
	return &PositionHandler{svc: svc}
}

func (h *PositionHandler) ListCategories(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *PositionHandler) ListPositions(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *PositionHandler) CreatePosition(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *PositionHandler) UpdatePosition(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}

func (h *PositionHandler) DeletePosition(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO", nil)
}
