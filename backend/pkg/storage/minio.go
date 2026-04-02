package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

// MinIOStorage MinIO 存储实现
type MinIOStorage struct {
	client    *minio.Client
	bucket    string
	publicURL string // 文件公开访问基础地址，如 http://localhost:9000
	logger    *zap.Logger
}

// NewMinIOStorage 创建 MinIO 存储实例
//
// publicURL 为文件访问基础地址，留空时自动从 endpoint+useSSL 推断。
func NewMinIOStorage(endpoint, accessKey, secretKey, bucket string, useSSL bool, publicURL string, logger *zap.Logger) (*MinIOStorage, error) {
	// 推断公开访问基础 URL
	if publicURL == "" {
		scheme := "http"
		if useSSL {
			scheme = "https"
		}
		publicURL = fmt.Sprintf("%s://%s", scheme, strings.TrimRight(endpoint, "/"))
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		logger.Warn("Failed to create MinIO client, storage will not be available",
			zap.String("endpoint", endpoint),
			zap.Error(err))
		return &MinIOStorage{
			bucket:    bucket,
			publicURL: publicURL,
			logger:    logger,
		}, nil
	}

	// 检查并自动创建 bucket
	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		logger.Warn("Failed to check MinIO bucket", zap.String("bucket", bucket), zap.Error(err))
	} else if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			logger.Warn("Failed to create MinIO bucket", zap.String("bucket", bucket), zap.Error(err))
		} else {
			logger.Info("MinIO bucket created", zap.String("bucket", bucket))
		}
	}

	logger.Info("MinIO storage initialized",
		zap.String("endpoint", endpoint),
		zap.String("bucket", bucket),
		zap.String("publicURL", publicURL),
	)

	return &MinIOStorage{
		client:    client,
		bucket:    bucket,
		publicURL: publicURL,
		logger:    logger,
	}, nil
}

// Upload 上传文件，size=-1 时由 MinIO SDK 自动探测
func (s *MinIOStorage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	if s.client == nil {
		s.logger.Warn("MinIO client not available, skipping upload", zap.String("key", key))
		return s.GetURL(key), nil
	}

	opts := minio.PutObjectOptions{}
	if contentType != "" {
		opts.ContentType = contentType
	}

	_, err := s.client.PutObject(ctx, s.bucket, key, reader, size, opts)
	if err != nil {
		s.logger.Error("MinIO upload failed", zap.String("key", key), zap.Error(err))
		return "", fmt.Errorf("upload to MinIO failed: %w", err)
	}

	url := s.GetURL(key)
	s.logger.Info("MinIO upload succeeded", zap.String("key", key), zap.String("url", url))
	return url, nil
}

// Delete 删除文件
func (s *MinIOStorage) Delete(ctx context.Context, key string) error {
	if s.client == nil {
		s.logger.Warn("MinIO client not available, skipping delete", zap.String("key", key))
		return nil
	}

	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		s.logger.Error("MinIO delete failed", zap.String("key", key), zap.Error(err))
		return fmt.Errorf("delete from MinIO failed: %w", err)
	}

	s.logger.Info("MinIO delete succeeded", zap.String("key", key))
	return nil
}

// GetURL 返回文件完整公开访问地址
func (s *MinIOStorage) GetURL(key string) string {
	return fmt.Sprintf("%s/%s/%s", strings.TrimRight(s.publicURL, "/"), s.bucket, key)
}

// GetObject 从 MinIO 获取文件内容，返回 (reader, size, contentType, error)
func (s *MinIOStorage) GetObject(ctx context.Context, key string) (io.ReadCloser, int64, string, error) {
	if s.client == nil {
		return nil, 0, "", fmt.Errorf("MinIO client not available")
	}

	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, 0, "", fmt.Errorf("get object from MinIO failed: %w", err)
	}

	info, err := obj.Stat()
	if err != nil {
		obj.Close()
		return nil, 0, "", fmt.Errorf("stat object failed: %w", err)
	}

	return obj, info.Size, info.ContentType, nil
}
