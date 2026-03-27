package crypto

import (
	"crypto/sha256"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// 全局盐值 - 用于增加密码安全性
const GlobalSalt = "bw-ai-check-platform-2026"

// HashPassword 使用加盐 bcrypt 对密码进行加密
// 流程：原始密码 -> SHA256(密码+盐) -> bcrypt加密
func HashPassword(password string) (string, error) {
	// 第一层：SHA256 加盐处理
	saltedPassword := fmt.Sprintf("%s%s%s", GlobalSalt, password, GlobalSalt)
	sha256Hash := sha256.Sum256([]byte(saltedPassword))

	// 第二层：bcrypt 加密（包含内部盐）
	hash, err := bcrypt.GenerateFromPassword(sha256Hash[:], bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword 验证密码
// 流程：原始密码 -> SHA256(密码+盐) -> 与bcrypt哈希对比
func VerifyPassword(hashedPassword, password string) error {
	// 对输入密码进行同样的 SHA256 加盐处理
	saltedPassword := fmt.Sprintf("%s%s%s", GlobalSalt, password, GlobalSalt)
	sha256Hash := sha256.Sum256([]byte(saltedPassword))

	// 与 bcrypt 哈希对比
	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), sha256Hash[:]); err == nil {
		return nil
	}

	// 兼容历史未加盐的 bcrypt 密码
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}
