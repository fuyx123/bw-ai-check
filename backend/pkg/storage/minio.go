package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

// MinIOStorage MinIO 存储实现
type MinIOStorage struct {
	client *minio.Client
	bucket string
	logger *zap.Logger
}

// NewMinIOStorage 创建 MinIO 存储实例
func NewMinIOStorage(endpoint, accessKey, secretKey, bucket string, useSSL bool, logger *zap.Logger) (*MinIOStorage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		logger.Warn("Failed to create MinIO client, storage will not be available",
			zap.String("endpoint", endpoint),
			zap.Error(err))
		return &MinIOStorage{
			bucket: bucket,
			logger: logger,
		}, nil
	}

	// 验证连接
	exists, err := client.BucketExists(context.Background(), bucket)
	if err != nil {
		logger.Warn("Failed to check if MinIO bucket exists", zap.String("bucket", bucket), zap.Error(err))
	} else if !exists {
		if err := client.MakeBucket(context.Background(), bucket, minio.MakeBucketOptions{}); err != nil {
			logger.Warn("Failed to create MinIO bucket", zap.String("bucket", bucket), zap.Error(err))
		} else {
			logger.Info("MinIO bucket created successfully", zap.String("bucket", bucket))
		}
	}

	return &MinIOStorage{
		client: client,
		bucket: bucket,
		logger: logger,
	}, nil
}

// Upload 上传文件
func (s *MinIOStorage) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	if s.client == nil {
		s.logger.Warn("MinIO client is not available, skipping upload", zap.String("key", key))
		return s.GetURL(key), nil
	}

	_, err := s.client.PutObject(ctx, s.bucket, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		s.logger.Error("Failed to upload file to MinIO", zap.String("key", key), zap.Error(err))
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	url := s.GetURL(key)
	s.logger.Info("File uploaded successfully", zap.String("key", key), zap.String("url", url))
	return url, nil
}

// Delete 删除文件
func (s *MinIOStorage) Delete(ctx context.Context, key string) error {
	if s.client == nil {
		s.logger.Warn("MinIO client is not available, skipping delete", zap.String("key", key))
		return nil
	}

	err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		s.logger.Error("Failed to delete file from MinIO", zap.String("key", key), zap.Error(err))
		return fmt.Errorf("failed to delete file: %w", err)
	}

	s.logger.Info("File deleted successfully", zap.String("key", key))
	return nil
}

// GetURL 获取文件访问 URL
func (s *MinIOStorage) GetURL(key string) string {
	return fmt.Sprintf("/%s/%s", s.bucket, key)
}
