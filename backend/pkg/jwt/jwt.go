package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrTokenExpired = errors.New("token expired")
)

// Claims JWT claims
type Claims struct {
	UserID     string `json:"userId"`
	LoginID    string `json:"loginId"`
	UserType   string `json:"userType"`   // student | staff
	DataScope  string `json:"dataScope"`  // school | college | major | class
	RoleID     string `json:"roleId"`
	DepartmentID string `json:"departmentId"`
	jwt.RegisteredClaims
}

var signingKey = []byte("your-secret-key-change-me") // 应该从配置读取

// SetSigningKey 设置签名密钥（从配置读取）
func SetSigningKey(key string) {
	signingKey = []byte(key)
}

// GenerateToken 生成 JWT token
func GenerateToken(claims Claims) (string, error) {
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		NotBefore: jwt.NewNumericDate(time.Now()),
		Issuer:    "bw-ai-check",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(signingKey)
}

// ParseToken 解析 JWT token
func ParseToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return signingKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.ExpiresAt.Time.Before(time.Now()) {
		return nil, ErrTokenExpired
	}

	return claims, nil
}

// GenerateTokenWithExpiry 生成指定过期时间的 JWT token
func GenerateTokenWithExpiry(claims Claims, expiryDuration time.Duration) (string, error) {
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiryDuration)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		NotBefore: jwt.NewNumericDate(time.Now()),
		Issuer:    "bw-ai-check",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(signingKey)
}
