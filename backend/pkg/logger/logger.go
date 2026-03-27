package logger

import (
	"os"
	"path/filepath"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

// Init 初始化日志系统
func Init(level, dir string, retentionDays int, compress bool) (*zap.Logger, error) {
	// 创建日志目录
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	// 解析日志级别
	var zapLevel zapcore.Level
	if err := zapLevel.UnmarshalText([]byte(level)); err != nil {
		zapLevel = zapcore.InfoLevel
	}

	// 配置文件轮转（按日期命名）
	writer := &lumberjack.Logger{
		Filename:   filepath.Join(dir, "app.log"),
		MaxAge:     retentionDays, // 保留 N 天
		MaxBackups: 0,             // 不限制备份文件数
		Compress:   compress,
		LocalTime:  true,
	}

	// 日志格式编码器配置
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "ts",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		FunctionKey:    "func",
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.LowercaseLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.SecondsDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// 文件输出：JSON 格式
	fileEncoder := zapcore.NewJSONEncoder(encoderConfig)
	fileCore := zapcore.NewCore(
		fileEncoder,
		zapcore.AddSync(writer),
		zapLevel,
	)

	// 控制台输出：Console 格式
	consoleEncoder := zapcore.NewConsoleEncoder(encoderConfig)
	consoleCore := zapcore.NewCore(
		consoleEncoder,
		zapcore.AddSync(os.Stdout),
		zapcore.DebugLevel, // 控制台总是输出 debug 及以上
	)

	// 组合两个 core
	core := zapcore.NewTee(fileCore, consoleCore)

	// 创建 logger，添加调用者信息和堆栈跟踪
	logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

	return logger, nil
}
