package main

import (
	"crypto/sha256"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
)

const GlobalSalt = "bw-ai-check-platform-2026"

// HashPassword 使用加盐 bcrypt 对密码进行加密
func HashPassword(password string) (string, error) {
	// 第一层：SHA256 加盐处理
	saltedPassword := fmt.Sprintf("%s%s%s", GlobalSalt, password, GlobalSalt)
	sha256Hash := sha256.Sum256([]byte(saltedPassword))

	// 第二层：bcrypt 加密
	hash, err := bcrypt.GenerateFromPassword(sha256Hash[:], bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword 验证密码
func VerifyPassword(hashedPassword, password string) error {
	// 对输入密码进行同样的 SHA256 加盐处理
	saltedPassword := fmt.Sprintf("%s%s%s", GlobalSalt, password, GlobalSalt)
	sha256Hash := sha256.Sum256([]byte(saltedPassword))

	// 与 bcrypt 哈希对比
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), sha256Hash[:])
}

func main() {
	testPassword := "123456"

	fmt.Println("=== 测试加盐加密和验证 ===")

	// 1. 生成哈希
	hash, err := HashPassword(testPassword)
	if err != nil {
		log.Fatalf("生成哈希失败: %v", err)
	}
	fmt.Printf("原始密码: %s\n", testPassword)
	fmt.Printf("生成的哈希: %s\n\n", hash)

	// 2. 验证密码
	fmt.Println("验证过程：")
	fmt.Printf("  输入: 原始密码 '%s'\n", testPassword)

	saltedInput := fmt.Sprintf("%s%s%s", GlobalSalt, testPassword, GlobalSalt)
	fmt.Printf("  加盐处理: '%s...%s'\n", saltedInput[:20], saltedInput[len(saltedInput)-20:])

	sha256Hash := sha256.Sum256([]byte(saltedInput))
	fmt.Printf("  SHA256哈希: %x\n\n", sha256Hash)

	err = VerifyPassword(hash, testPassword)
	if err == nil {
		fmt.Println("✓ 密码验证成功！")
	} else {
		fmt.Printf("✗ 密码验证失败: %v\n", err)
	}

	// 3. 测试错误密码
	fmt.Println("\n验证错误密码：")
	err = VerifyPassword(hash, "wrong")
	if err == nil {
		fmt.Println("✗ 不应该验证成功！")
	} else {
		fmt.Println("✓ 正确地拒绝了错误密码")
	}
}
