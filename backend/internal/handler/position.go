package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
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
	categories, err := h.svc.ListCategories()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, categories)
}

func (h *PositionHandler) CreateCategory(c *gin.Context) {
	var req dto.CreatePositionCategoryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	category, err := h.svc.CreateCategory(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, category)
}

func (h *PositionHandler) UpdateCategory(c *gin.Context) {
	var req dto.UpdatePositionCategoryReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	category, err := h.svc.UpdateCategory(accessContext(c), c.Param("code"), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, category)
}

func (h *PositionHandler) DeleteCategory(c *gin.Context) {
	if err := h.svc.DeleteCategory(accessContext(c), c.Param("code")); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

func (h *PositionHandler) ListPositions(c *gin.Context) {
	positions, err := h.svc.ListPositions()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, positions)
}

func (h *PositionHandler) CreatePosition(c *gin.Context) {
	var req dto.CreatePositionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	position, err := h.svc.CreatePosition(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, position)
}

func (h *PositionHandler) UpdatePosition(c *gin.Context) {
	var req dto.UpdatePositionReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	position, err := h.svc.UpdatePosition(accessContext(c), c.Param("id"), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, position)
}

func (h *PositionHandler) DeletePosition(c *gin.Context) {
	if err := h.svc.DeletePosition(accessContext(c), c.Param("id")); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}
