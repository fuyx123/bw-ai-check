package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type AuditLogHandler struct {
	svc *service.AuditLogService
}

func NewAuditLogHandler(svc *service.AuditLogService) *AuditLogHandler {
	return &AuditLogHandler{svc: svc}
}

func (h *AuditLogHandler) List(c *gin.Context) {
	page, pageSize := paginationFromQuery(c)
	logs, total, err := h.svc.List(page, pageSize)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.PageOK(c, logs, total, page, pageSize)
}
