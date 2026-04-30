package handler

import (
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/converter"
	"bw-ai-check/backend/pkg/response"
)

// ExamHandler 阅卷管理 HTTP 处理器
type ExamHandler struct {
	svc       *service.ExamService
	cycleSvc  *service.CycleService
	graderSvc *service.ExamGraderService
}

// NewExamHandler 创建阅卷管理处理器
func NewExamHandler(svc *service.ExamService, cycleSvc *service.CycleService, graderSvc *service.ExamGraderService) *ExamHandler {
	return &ExamHandler{svc: svc, cycleSvc: cycleSvc, graderSvc: graderSvc}
}

// ListCycles 返回阅卷页可用的教学周期列表。
func (h *ExamHandler) ListCycles(c *gin.Context) {
	cycles, err := h.cycleSvc.ListCycles()
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, cycles)
}

// GetCycle 返回阅卷页使用的教学周期详情与考次统计。
func (h *ExamHandler) GetCycle(c *gin.Context) {
	id := c.Param("id")
	classID := c.Query("classId")
	cycle, err := h.cycleSvc.GetCycleWithSessions(id, accessContext(c), classID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, cycle)
}

// Upload 单文件上传
func (h *ExamHandler) Upload(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, response.CodeParamError, "请选择要上传的文件")
		return
	}

	examSessionID := c.PostForm("examSessionId")
	classID := c.PostForm("classId")
	className := c.PostForm("className")

	record, err := h.svc.UploadFile(accessContext(c), fileHeader, examSessionID, classID, className)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	response.OKWithData(c, record)
}

// BatchUpload 压缩包批量上传
func (h *ExamHandler) BatchUpload(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		response.Fail(c, response.CodeParamError, "请选择要上传的压缩包")
		return
	}

	examSessionID := c.PostForm("examSessionId")
	classID := c.PostForm("classId")
	className := c.PostForm("className")

	records, err := h.svc.BatchUpload(accessContext(c), fileHeader, examSessionID, classID, className)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	response.OKWithData(c, gin.H{
		"count": len(records),
		"items": records,
	})
}

// List 文件列表
func (h *ExamHandler) List(c *gin.Context) {
	page, pageSize := paginationFromQuery(c)
	classID := c.Query("classId")
	examSessionID := c.Query("examSessionId")
	cycleID := c.Query("cycleId")

	files, total, err := h.svc.List(accessContext(c), page, pageSize, classID, examSessionID, cycleID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	response.PageOK(c, files, total, page, pageSize)
}

// Delete 删除文件
func (h *ExamHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(accessContext(c), id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// PreviewDocx 将 .doc 文件转换为 .docx 后返回，供前端 docx-preview 渲染。
// 若文件本身是 .docx 则直接返回原始内容。
// 若 LibreOffice 未安装，返回 HTTP 501，前端展示"下载查看"提示。
func (h *ExamHandler) PreviewDocx(c *gin.Context) {
	id := c.Param("id")

	data, name, _, err := h.svc.StreamFileAsDocx(id)
	if err != nil {
		if err == converter.ErrNotAvailable {
			c.JSON(http.StatusNotImplemented, gin.H{"message": "LibreOffice 未安装，暂不支持 .doc 在线预览"})
			return
		}
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	encodedName := url.PathEscape(name)
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename*=UTF-8''%s`, encodedName))
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	c.Header("Access-Control-Expose-Headers", "Content-Disposition")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data)
}

// ListClasses 返回当前用户可访问的班级列表（用于前端筛选器）
func (h *ExamHandler) ListClasses(c *gin.Context) {
	classes, err := h.svc.GetAccessibleClasses(accessContext(c))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, classes)
}

func (h *ExamHandler) GetTrendReport(c *gin.Context) {
	item, err := h.svc.GetTrendReport(accessContext(c), c.Query("cycleId"), c.Query("classId"))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, item)
}

// GetGradingDetail 获取单份试卷的阅卷明细（含 AI 结构化评分 + 人工复阅信息）
func (h *ExamHandler) GetGradingDetail(c *gin.Context) {
	id := c.Param("id")
	file, err := h.svc.GetGradingDetail(accessContext(c), id)
	if err != nil {
		if err.Error() == "阅卷老师尚未完成复阅，暂无权限查看" {
			c.JSON(403, gin.H{"code": 403, "message": err.Error()})
			return
		}
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, file)
}

// SubmitManualReview 提交人工复阅结果（逐题评分模式）
func (h *ExamHandler) SubmitManualReview(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		QuestionScores []struct {
			No    int `json:"no"`
			Score int `json:"score"`
		} `json:"questionScores" binding:"required"`
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Fail(c, response.CodeParamError, "参数错误: "+err.Error())
		return
	}
	// 校验每题分数非负
	for _, qs := range input.QuestionScores {
		if qs.Score < 0 {
			response.Fail(c, response.CodeParamError, "每题分数不能为负数")
			return
		}
	}
	// 转换为 service 层类型
	scores := make([]service.ManualQuestionScore, len(input.QuestionScores))
	for i, qs := range input.QuestionScores {
		scores[i] = service.ManualQuestionScore{No: qs.No, Score: qs.Score}
	}
	if err := h.svc.SubmitManualReview(accessContext(c), id, input.Comment, scores); err != nil {
		if err.Error() == "您不是该考次的指定阅卷老师，无权进行复阅" {
			c.JSON(403, gin.H{"code": 403, "message": err.Error()})
			return
		}
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// ListSessionGraders 获取考次的阅卷老师分配列表
func (h *ExamHandler) ListSessionGraders(c *gin.Context) {
	sessionID := c.Param("sessionId")
	graders, err := h.graderSvc.ListBySession(sessionID)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, graders)
}

// UpsertSessionGrader 设置考次某班级的阅卷老师
func (h *ExamHandler) UpsertSessionGrader(c *gin.Context) {
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

// DeleteSessionGrader 删除阅卷老师分配
func (h *ExamHandler) DeleteSessionGrader(c *gin.Context) {
	id := c.Param("id")
	if err := h.graderSvc.Delete(id); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

// Download 代理下载文件内容，供前端本地预览使用
func (h *ExamHandler) Download(c *gin.Context) {
	id := c.Param("id")

	reader, size, contentType, originalName, err := h.svc.StreamFile(id)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	defer reader.Close()

	// 若 MinIO 未返回 contentType，根据文件扩展名推断
	if contentType == "" || contentType == "application/octet-stream" {
		ext := strings.ToLower(filepath.Ext(originalName))
		switch ext {
		case ".docx":
			contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
		case ".doc":
			contentType = "application/msword"
		}
	}

	encodedName := url.PathEscape(originalName)
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename*=UTF-8''%s`, encodedName))
	c.Header("Content-Type", contentType)
	c.Header("Access-Control-Expose-Headers", "Content-Disposition")
	if size > 0 {
		c.Header("Content-Length", fmt.Sprintf("%d", size))
	}

	c.DataFromReader(200, size, contentType, reader, nil)
}
