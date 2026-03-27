package config

import (
	"log"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Logger   LoggerConfig
	Storage  StorageConfig
	CORS     CORSConfig
}

type ServerConfig struct {
	Port string
	Mode string
}

type DatabaseConfig struct {
	DSN string
}

type JWTConfig struct {
	Secret      string
	ExpireHours int
}

type LoggerConfig struct {
	Level         string
	Dir           string
	RetentionDays int
	Compress      bool
}

type StorageConfig struct {
	Driver    string
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

type CORSConfig struct {
	AllowOrigins string
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
	viper.SetDefault("JWT_EXPIRE_HOURS", 24)
	viper.SetDefault("PORT", "8080")
	viper.SetDefault("GIN_MODE", "debug")
	viper.SetDefault("LOG_LEVEL", "info")
	viper.SetDefault("LOG_DIR", "logs")
	viper.SetDefault("LOG_RETENTION_DAYS", 7)
	viper.SetDefault("LOG_COMPRESS", true)
	viper.SetDefault("STORAGE_DRIVER", "minio")
	viper.SetDefault("STORAGE_ENDPOINT", "localhost:9000")
	viper.SetDefault("STORAGE_ACCESS_KEY", "minioadmin")
	viper.SetDefault("STORAGE_SECRET_KEY", "minioadmin")
	viper.SetDefault("STORAGE_BUCKET", "bw-ai-check")
	viper.SetDefault("STORAGE_USE_SSL", false)
	viper.SetDefault("CORS_ALLOW_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000")

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
		Database: DatabaseConfig{
			DSN: viper.GetString("DB_DSN"),
		},
		JWT: JWTConfig{
			Secret:      viper.GetString("JWT_SECRET"),
			ExpireHours: viper.GetInt("JWT_EXPIRE_HOURS"),
		},
		Server: ServerConfig{
			Port: viper.GetString("PORT"),
			Mode: viper.GetString("GIN_MODE"),
		},
		Logger: LoggerConfig{
			Level:         viper.GetString("LOG_LEVEL"),
			Dir:           viper.GetString("LOG_DIR"),
			RetentionDays: viper.GetInt("LOG_RETENTION_DAYS"),
			Compress:      viper.GetBool("LOG_COMPRESS"),
		},
		Storage: StorageConfig{
			Driver:    viper.GetString("STORAGE_DRIVER"),
			Endpoint:  viper.GetString("STORAGE_ENDPOINT"),
			AccessKey: viper.GetString("STORAGE_ACCESS_KEY"),
			SecretKey: viper.GetString("STORAGE_SECRET_KEY"),
			Bucket:    viper.GetString("STORAGE_BUCKET"),
			UseSSL:    viper.GetBool("STORAGE_USE_SSL"),
		},
		CORS: CORSConfig{
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
