package storage

import (
	"context"
	"io"
)

// Storage 定义文件存储接口，支持扩展多种实现 (MinIO, OSS, S3 等)
type Storage interface {
	// Upload 上传文件，返回文件 URL
	Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error)

	// Delete 删除文件
	Delete(ctx context.Context, key string) error

	// GetURL 获取文件访问 URL
	GetURL(key string) string
}
