package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type MenuHandler struct {
	svc *service.MenuService
}

func NewMenuHandler(svc *service.MenuService) *MenuHandler {
	return &MenuHandler{svc: svc}
}

func (h *MenuHandler) GetTree(c *gin.Context) {
	menus, err := h.svc.GetTree()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, menus)
}

func (h *MenuHandler) GetUserMenus(c *gin.Context) {
	menus, err := h.svc.GetUserMenus(accessContext(c))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, menus)
}

func (h *MenuHandler) Create(c *gin.Context) {
	var req dto.CreateMenuReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	menu, err := h.svc.Create(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, menu)
}

func (h *MenuHandler) Update(c *gin.Context) {
	var req dto.UpdateMenuReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	menu, err := h.svc.Update(accessContext(c), c.Param("id"), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, menu)
}

func (h *MenuHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(accessContext(c), c.Param("id")); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}
