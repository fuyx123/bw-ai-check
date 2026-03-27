package middleware

import (
	"net/url"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS CORS 跨域中间件
func CORS(allowOrigins string) gin.HandlerFunc {
	origins := make(map[string]struct{})
	for _, origin := range strings.Split(allowOrigins, ",") {
		origin = strings.TrimSpace(origin)
		if origin == "" {
			continue
		}
		origins[origin] = struct{}{}
	}
	config := cors.DefaultConfig()
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"}
	config.AllowHeaders = []string{"Content-Type", "Authorization", "X-Requested-With"}
	config.ExposeHeaders = []string{"Content-Length", "X-Total-Count"}
	config.AllowCredentials = true
	config.AllowOriginFunc = func(origin string) bool {
		if _, ok := origins[origin]; ok {
			return true
		}

		parsed, err := url.Parse(origin)
		if err != nil {
			return false
		}

		hostname := parsed.Hostname()
		switch hostname {
		case "localhost", "127.0.0.1", "::1":
			return parsed.Scheme == "http" || parsed.Scheme == "https"
		default:
			return false
		}
	}

	return cors.New(config)
}
