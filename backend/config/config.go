package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	Database struct {
		DSN string
	}
	JWT struct {
		Secret string
	}
	Server struct {
		Port string
	}
	CORS struct {
		AllowOrigins string
	}
}

var cfg *Config

// Init 初始化配置
func Init() error {
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./backend")

	// 设置默认值
	viper.SetDefault("DB_DSN", "root:@tcp(localhost:3306)/educational_admin?charset=utf8mb4&parseTime=True&loc=Local")
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-me")
	viper.SetDefault("PORT", "8080")
	viper.SetDefault("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://localhost:3000")

	// 读取环境变量
	viper.AutomaticEnv()

	// 尝试读取 .env 文件
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return err
		}
		log.Println("⚠ .env file not found, using defaults and environment variables")
	}

	cfg = &Config{
		Database: struct{ DSN string }{
			DSN: viper.GetString("DB_DSN"),
		},
		JWT: struct{ Secret string }{
			Secret: viper.GetString("JWT_SECRET"),
		},
		Server: struct{ Port string }{
			Port: viper.GetString("PORT"),
		},
		CORS: struct{ AllowOrigins string }{
			AllowOrigins: viper.GetString("CORS_ALLOW_ORIGINS"),
		},
	}

	log.Println("✓ Config loaded successfully")
	return nil
}

// Get 获取配置实例
func Get() *Config {
	return cfg
}
