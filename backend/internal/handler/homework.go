package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

// HomeworkHandler 作业审批处理器
type HomeworkHandler struct {
	svc *service.HomeworkService
}

func NewHomeworkHandler(svc *service.HomeworkService) *HomeworkHandler {
	return &HomeworkHandler{svc: svc}
}

func (h *HomeworkHandler) ListClasses(c *gin.Context) {
	items, err := h.svc.GetAccessibleClasses(accessContext(c))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, items)
}

func (h *HomeworkHandler) UploadSubmission(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, response.CodeParamError, "请选择作业压缩包")
		return
	}
	item, err := h.svc.UploadSubmission(accessContext(c), fileHeader)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, item)
}

func (h *HomeworkHandler) ListMySubmissions(c *gin.Context) {
	page, pageSize := paginationFromQuery(c)
	items, total, err := h.svc.ListMySubmissions(accessContext(c), page, pageSize)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.PageOK(c, items, total, page, pageSize)
}

func (h *HomeworkHandler) ListSubmissions(c *gin.Context) {
	page, pageSize := paginationFromQuery(c)
	departmentID := strings.TrimSpace(c.Query("departmentId"))
	if departmentID == "" {
		departmentID = strings.TrimSpace(c.Query("classId"))
	}
	items, total, err := h.svc.ListSubmissions(
		accessContext(c),
		page,
		pageSize,
		c.Query("homeworkId"),
		departmentID,
		c.Query("status"),
	)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.PageOK(c, items, total, page, pageSize)
}

func (h *HomeworkHandler) GetSubmissionDetail(c *gin.Context) {
	item, err := h.svc.GetSubmissionDetail(accessContext(c), c.Param("id"))
	if err != nil {
		if err.Error() == "无权查看该作业明细" || err.Error() == "无权查看他人的作业明细" {
			c.JSON(http.StatusForbidden, gin.H{"code": response.CodePermissionDeny, "message": err.Error()})
			return
		}
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, item)
}

func (h *HomeworkHandler) ListMissing(c *gin.Context) {
	departmentID := strings.TrimSpace(c.Query("departmentId"))
	if departmentID == "" {
		departmentID = strings.TrimSpace(c.Query("classId"))
	}
	items, err := h.svc.ListMissing(accessContext(c), c.Query("checkDate"), departmentID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, items)
}

func (h *HomeworkHandler) GetReport(c *gin.Context) {
	departmentID := strings.TrimSpace(c.Query("departmentId"))
	if departmentID == "" {
		departmentID = strings.TrimSpace(c.Query("classId"))
	}
	item, err := h.svc.GetReport(accessContext(c), c.Query("checkDate"), departmentID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, item)
}
