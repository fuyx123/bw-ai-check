package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

// AIModelHandler 大模型管理 HTTP 处理器
type AIModelHandler struct {
	svc *service.AIModelService
}

func NewAIModelHandler(svc *service.AIModelService) *AIModelHandler {
	return &AIModelHandler{svc: svc}
}

// List 获取模型列表
func (h *AIModelHandler) List(c *gin.Context) {
	vos, err := h.svc.List()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, vos)
}

// Create 创建模型
func (h *AIModelHandler) Create(c *gin.Context) {
	var input service.CreateModelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}
	vo, err := h.svc.Create(input)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, vo)
}

// Update 更新模型
func (h *AIModelHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var input service.UpdateModelInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}
	vo, err := h.svc.Update(id, input)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, vo)
}

// Delete 删除模型
func (h *AIModelHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// Enable 启用模型（同时停用其他）
func (h *AIModelHandler) Enable(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Enable(id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// Disable 停用模型
func (h *AIModelHandler) Disable(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Disable(id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}
