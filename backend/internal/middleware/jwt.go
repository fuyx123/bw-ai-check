package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	jwtpkg "bw-ai-check/backend/pkg/jwt"
	"bw-ai-check/backend/pkg/response"
)

// JWTMiddleware JWT 认证中间件
func JWTMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Fail(c, response.CodeAuthFailed, "missing authorization header")
			c.Abort()
			return
		}

		// 提取 Bearer Token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Fail(c, response.CodeAuthFailed, "invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// 解析 Token
		claims, err := jwtpkg.ParseToken(tokenString)
		if err != nil {
			code := response.CodeTokenInvalid
			message := "invalid token"
			if err == jwtpkg.ErrTokenExpired {
				code = response.CodeTokenExpired
				message = "token expired"
			}
			response.Fail(c, code, message)
			c.Abort()
			return
		}

		// 将 claims 存入 context
		c.Set("claims", claims)
		c.Set("userId", claims.UserID)
		c.Set("userType", claims.UserType)
		c.Set("roleId", claims.RoleID)
		c.Set("dataScope", claims.DataScope)
		c.Set("departmentId", claims.DepartmentID)

		c.Next()
	}
}

// GetClaims 从 context 获取 claims
func GetClaims(c *gin.Context) *jwtpkg.Claims {
	claims, exists := c.Get("claims")
	if !exists {
		return nil
	}
	return claims.(*jwtpkg.Claims)
}

// GetUserID 从 context 获取 userId
func GetUserID(c *gin.Context) string {
	userId, _ := c.Get("userId")
	return userId.(string)
}

// GetDataScope 从 context 获取 dataScope
func GetDataScope(c *gin.Context) string {
	dataScope, _ := c.Get("dataScope")
	return dataScope.(string)
}

// GetDepartmentID 从 context 获取 departmentId
func GetDepartmentID(c *gin.Context) string {
	deptId, exists := c.Get("departmentId")
	if !exists {
		return ""
	}
	return deptId.(string)
}

// GetRoleID 从 context 获取 roleId
func GetRoleID(c *gin.Context) string {
	roleId, _ := c.Get("roleId")
	return roleId.(string)
}

// GetUserType 从 context 获取 userType（student | staff）
func GetUserType(c *gin.Context) string {
	v, exists := c.Get("userType")
	if !exists {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
