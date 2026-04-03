package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"bw-ai-check/backend/config"
	"bw-ai-check/backend/internal/app"
	"bw-ai-check/backend/internal/router"
	"bw-ai-check/backend/pkg/database"
	pkglogger "bw-ai-check/backend/pkg/logger"
)

func main() {
	if err := config.Init(); err != nil {
		log.Fatalf("配置加载失败: %v", err)
	}
	cfg := config.Get()

	zapLogger, err := pkglogger.Init(
		cfg.Logger.Level,
		cfg.Logger.Dir,
		cfg.Logger.RetentionDays,
		cfg.Logger.Compress,
	)
	if err != nil {
		log.Fatalf("日志初始化失败: %v", err)
	}
	defer func() { _ = zapLogger.Sync() }()

	if err := database.Init(cfg.Database.DSN); err != nil {
		zapLogger.Fatal("数据库连接失败", zap.Error(err))
	}
	defer func() {
		if closeErr := database.Close(); closeErr != nil {
			zapLogger.Error("关闭数据库失败", zap.Error(closeErr))
		}
	}()

	if err := app.PrepareDatabase(database.DB, zapLogger); err != nil {
		zapLogger.Fatal("数据库准备失败", zap.Error(err))
	}

	gin.SetMode(cfg.Server.Mode)
	engine := gin.New()
	engine.Use(gin.Recovery())

	container, err := app.NewContainer(cfg, zapLogger, database.DB)
	if err != nil {
		zapLogger.Fatal("容器初始化失败", zap.Error(err))
	}

	router.SetupRoutes(engine, container)

	addr := ":" + cfg.Server.Port
	if cfg.Server.Port == "" {
		addr = ":8080"
	}
	zapLogger.Info("HTTP 服务启动", zap.String("addr", addr))
	if err := engine.Run(addr); err != nil {
		zapLogger.Error("服务退出", zap.Error(err))
		os.Exit(1)
	}
}
