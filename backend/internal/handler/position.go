package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type PositionHandler struct{}

func NewPositionHandler() *PositionHandler {
	return &PositionHandler{}
}

func (h *PositionHandler) ListCategories(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement list position categories", nil)
}

func (h *PositionHandler) ListPositions(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement list positions", nil)
}

func (h *PositionHandler) CreatePosition(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement create position", nil)
}

func (h *PositionHandler) UpdatePosition(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement update position", nil)
}

func (h *PositionHandler) DeletePosition(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement delete position", nil)
}
