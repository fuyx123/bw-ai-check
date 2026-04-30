package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

// CycleHandler 教学周期 HTTP 处理器
type CycleHandler struct {
	svc       *service.CycleService
	userSvc   *service.UserService
	graderSvc *service.ExamGraderService
}

func NewCycleHandler(svc *service.CycleService, userSvc *service.UserService, graderSvc *service.ExamGraderService) *CycleHandler {
	return &CycleHandler{svc: svc, userSvc: userSvc, graderSvc: graderSvc}
}

// ListCycles GET /api/v1/cycles
func (h *CycleHandler) ListCycles(c *gin.Context) {
	cycles, err := h.svc.ListCycles()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, cycles)
}

// ListStaff GET /api/v1/cycles/staff
func (h *CycleHandler) ListStaff(c *gin.Context) {
	users, _, _, err := h.userSvc.List(accessContext(c), dto.UserFilter{UserType: "staff"}, 1, 200)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	items := make([]gin.H, 0, len(users))
	for _, user := range users {
		items = append(items, gin.H{
			"id":      user.ID,
			"name":    user.Name,
			"loginId": user.LoginID,
			"email":   user.Email,
		})
	}
	response.OKWithData(c, items)
}

// CreateCycle POST /api/v1/cycles
func (h *CycleHandler) CreateCycle(c *gin.Context) {
	var req struct {
		Name      string `json:"name" binding:"required"`
		StartDate string `json:"startDate" binding:"required"`
		EndDate   string `json:"endDate" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}
	cycle, err := h.svc.CreateCycle(req.Name, req.StartDate, req.EndDate)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, cycle)
}

// GetCycle GET /api/v1/cycles/:id  — 含考次列表和提交统计
// Query: classId（可选，按班级缩小统计范围）
func (h *CycleHandler) GetCycle(c *gin.Context) {
	id := c.Param("id")
	classID := c.Query("classId")
	cycle, err := h.svc.GetCycleWithSessions(id, accessContext(c), classID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, cycle)
}

// ListSessionGraders GET /api/v1/cycles/sessions/:sessionId/graders
func (h *CycleHandler) ListSessionGraders(c *gin.Context) {
	sessionID := c.Param("sessionId")
	graders, err := h.graderSvc.ListBySession(sessionID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, graders)
}

// UpsertSessionGrader POST /api/v1/cycles/sessions/:sessionId/graders
func (h *CycleHandler) UpsertSessionGrader(c *gin.Context) {
	sessionID := c.Param("sessionId")
	var input service.UpsertInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Fail(c, response.CodeParamError, "参数错误: "+err.Error())
		return
	}
	grader, err := h.graderSvc.Upsert(sessionID, input)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, grader)
}

// DeleteSessionGrader DELETE /api/v1/cycles/sessions/graders/:id
func (h *CycleHandler) DeleteSessionGrader(c *gin.Context) {
	id := c.Param("id")
	if err := h.graderSvc.Delete(id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// DeleteCycle DELETE /api/v1/cycles/:id
func (h *CycleHandler) DeleteCycle(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.DeleteCycle(id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// ImportSchedule POST /api/v1/cycles/:id/import  — 上传 Excel 解析考次
func (h *CycleHandler) ImportSchedule(c *gin.Context) {
	id := c.Param("id")
	fh, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, response.CodeParamError, "请选择要上传的 Excel 文件")
		return
	}
	sessions, err := h.svc.ImportSchedule(id, fh)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, gin.H{
		"count":    len(sessions),
		"sessions": sessions,
	})
}
