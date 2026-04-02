package main

import (
	"crypto/sha256"
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

const GlobalSalt = "bw-ai-check-platform-2026"

type User struct {
	ID       string
	LoginID  string
	Password string
}

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

func main() {
	dsn := "root:4ay1nkal3u8ed77y@tcp(115.190.140.148:3306)/bw-ai-check?charset=utf8mb4&parseTime=True&loc=Local"

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}

	fmt.Println("使用加盐方式重新生成所有用户密码哈希...")

	// 查询所有用户和原始密码
	var users []User
	if err := db.Table("users_copy1").Select("id, login_id, password").Find(&users).Error; err != nil {
		log.Fatalf("Failed to query users_copy1: %v", err)
	}

	successCount := 0
	for _, u := range users {
		// 使用新的加盐方法生成哈希
		hash, err := HashPassword(u.Password)
		if err != nil {
			fmt.Printf("✗ 处理失败 [%s]: %v\n", u.ID, err)
			continue
		}

		// 更新数据库
		result := db.Table("users").
			Where("id = ?", u.ID).
			Update("password_hash", hash)

		if result.Error != nil {
			fmt.Printf("✗ 更新失败 [%s]: %v\n", u.ID, result.Error)
		} else {
			fmt.Printf("✓ [%s] %s (密码: %s) 已加盐加密\n", u.ID, u.LoginID, u.Password)
			successCount++
		}
	}

	fmt.Printf("\n✓ 完成！成功处理 %d 个用户\n", successCount)
	fmt.Println("\n密码加密方式：")
	fmt.Println("  原始密码 → SHA256(盐+密码+盐) → bcrypt 加密")
}
