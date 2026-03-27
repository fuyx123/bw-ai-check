package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type RoleHandler struct {
	svc *service.RoleService
}

func NewRoleHandler(svc *service.RoleService) *RoleHandler {
	return &RoleHandler{svc: svc}
}

func (h *RoleHandler) List(c *gin.Context) {
	roles, err := h.svc.List()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, roles)
}

func (h *RoleHandler) GetWithMenus(c *gin.Context) {
	role, err := h.svc.GetWithMenus(c.Param("id"))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, role)
}

func (h *RoleHandler) Create(c *gin.Context) {
	var req dto.CreateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	role, err := h.svc.Create(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, role)
}

func (h *RoleHandler) Update(c *gin.Context) {
	var req dto.UpdateRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	role, err := h.svc.Update(accessContext(c), c.Param("id"), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, role)
}

func (h *RoleHandler) UpdateMenus(c *gin.Context) {
	var req dto.UpdateRoleMenusReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	role, err := h.svc.UpdateMenus(accessContext(c), c.Param("id"), req.MenuIds)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, role)
}

func (h *RoleHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(accessContext(c), c.Param("id")); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}
