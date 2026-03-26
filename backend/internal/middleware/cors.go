package middleware

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS CORS 跨域中间件
func CORS(allowOrigins string) gin.HandlerFunc {
	origins := strings.Split(allowOrigins, ",")
	config := cors.DefaultConfig()
	config.AllowOrigins = origins
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"}
	config.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length", "X-Total-Count"}
	config.AllowCredentials = true

	return cors.New(config)
}
