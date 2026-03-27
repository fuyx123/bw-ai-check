package handler

import (
	"github.com/gin-gonic/gin"

	"bw-ai-check/backend/internal/dto"
	"bw-ai-check/backend/internal/service"
	"bw-ai-check/backend/pkg/response"
)

type UserHandler struct {
	svc *service.UserService
}

func NewUserHandler(svc *service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) List(c *gin.Context) {
	page, pageSize := paginationFromQuery(c)
	filter := dto.UserFilter{
		Keyword:      c.Query("keyword"),
		UserType:     c.Query("userType"),
		DepartmentID: c.Query("departmentId"),
		RoleID:       c.Query("roleId"),
	}

	users, total, totalActive, err := h.svc.List(accessContext(c), filter, page, pageSize)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}

	response.PageOKWithExtra(c, users, total, page, pageSize, map[string]interface{}{
		"totalActive": totalActive,
	})
}

func (h *UserHandler) GetDetail(c *gin.Context) {
	user, err := h.svc.GetDetail(accessContext(c), c.Param("id"))
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, user)
}

func (h *UserHandler) Create(c *gin.Context) {
	var req dto.CreateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	user, err := h.svc.Create(accessContext(c), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, user)
}

func (h *UserHandler) Update(c *gin.Context) {
	var req dto.UpdateUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	user, err := h.svc.Update(accessContext(c), c.Param("id"), req)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, user)
}

func (h *UserHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(accessContext(c), c.Param("id")); err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OK(c)
}

func (h *UserHandler) ToggleStatus(c *gin.Context) {
	var req dto.ToggleStatusReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, response.CodeParamError, err.Error())
		return
	}

	user, err := h.svc.ToggleStatus(accessContext(c), c.Param("id"), req.IsActive)
	if err != nil {
		response.Fail(c, response.CodeOperationFail, err.Error())
		return
	}
	response.OKWithData(c, user)
}
