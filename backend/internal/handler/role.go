package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type RoleHandler struct{}

func NewRoleHandler() *RoleHandler {
	return &RoleHandler{}
}

func (h *RoleHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement role list", nil)
}

func (h *RoleHandler) GetWithMenus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement get role with menus", nil)
}

func (h *RoleHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement create role", nil)
}

func (h *RoleHandler) UpdateMenus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement update role menus", nil)
}

func (h *RoleHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement delete role", nil)
}
