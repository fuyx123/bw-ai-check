package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type MenuHandler struct{}

func NewMenuHandler() *MenuHandler {
	return &MenuHandler{}
}

func (h *MenuHandler) GetTree(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement menu tree", nil)
}

func (h *MenuHandler) GetUserMenus(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement get user menus", nil)
}

func (h *MenuHandler) Create(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement create menu", nil)
}

func (h *MenuHandler) Update(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement update menu", nil)
}

func (h *MenuHandler) Delete(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement delete menu", nil)
}
