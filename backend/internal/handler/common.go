package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/middleware"
	"bw-ai-check/backend/internal/service"
)

func accessContext(c *gin.Context) service.AccessContext {
	return service.AccessContext{
		UserID:       middleware.GetUserID(c),
		UserType:     middleware.GetUserType(c),
		RoleID:       middleware.GetRoleID(c),
		DepartmentID: middleware.GetDepartmentID(c),
		DataScope:    middleware.GetDataScope(c),
	}
}

func paginationFromQuery(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	return page, pageSize
}
