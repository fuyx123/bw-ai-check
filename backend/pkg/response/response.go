package response

import (
	"time"

	"github.com/gin-gonic/gin"
)

// Response 统一响应格式
type Response struct {
	Code      int         `json:"code"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message"`
	Timestamp string      `json:"timestamp"`
}

// PaginationData 分页数据
type PaginationData struct {
	Items     interface{} `json:"items"`
	Total     int64       `json:"total"`
	Page      int         `json:"page"`
	PageSize  int         `json:"pageSize"`
	TotalTemp int64       `json:"totalTemp,omitempty"` // 用于扩展字段如 totalActive
}

// Error codes
const (
	CodeOK             = 0
	CodeParamError     = 1001
	CodeNotFound       = 1003
	CodeDuplicate      = 1004
	CodeOperationFail  = 1005
	CodeBusinessError  = 1006
	CodeAuthFailed     = 2001
	CodeTokenExpired   = 2002
	CodeTokenInvalid   = 2003
	CodePermissionDeny = 1002
)

// OK 成功响应（无数据）
func OK(c *gin.Context) {
	c.JSON(200, Response{
		Code:      CodeOK,
		Message:   "success",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// OKWithData 成功响应（带数据）
func OKWithData(c *gin.Context, data interface{}) {
	c.JSON(200, Response{
		Code:      CodeOK,
		Data:      data,
		Message:   "success",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// PageOK 分页成功响应
func PageOK(c *gin.Context, items interface{}, total int64, page int, pageSize int) {
	c.JSON(200, Response{
		Code: CodeOK,
		Data: PaginationData{
			Items:    items,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		},
		Message:   "success",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// PageOKWithExtra 分页响应（带额外字段）
func PageOKWithExtra(c *gin.Context, items interface{}, total int64, page int, pageSize int, extra map[string]interface{}) {
	data := PaginationData{
		Items:    items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}
	c.JSON(200, gin.H{
		"code":      CodeOK,
		"data":      data,
		"message":   "success",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// Fail 失败响应
func Fail(c *gin.Context, code int, message string) {
	httpCode := 200
	if code >= 2000 {
		httpCode = 401
	} else if code >= 1000 {
		httpCode = 400
	}
	c.JSON(httpCode, Response{
		Code:      code,
		Message:   message,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

// FailWithData 失败响应（带数据）
func FailWithData(c *gin.Context, code int, message string, data interface{}) {
	httpCode := 200
	if code >= 2000 {
		httpCode = 401
	} else if code >= 1000 {
		httpCode = 400
	}
	c.JSON(httpCode, Response{
		Code:      code,
		Data:      data,
		Message:   message,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}
