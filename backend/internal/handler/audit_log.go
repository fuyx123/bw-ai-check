package handler

import (
	"github.com/gin-gonic/gin"
	"bw-ai-check/backend/pkg/response"
)

type AuditLogHandler struct{}

func NewAuditLogHandler() *AuditLogHandler {
	return &AuditLogHandler{}
}

func (h *AuditLogHandler) List(c *gin.Context) {
	response.FailWithData(c, response.CodeOperationFail, "TODO: implement audit log list", nil)
}
