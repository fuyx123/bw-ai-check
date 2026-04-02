// Package uploader 提供统一的文件上传封装，屏蔽底层存储细节。
// 支持单文件上传（multipart）和字节流上传（压缩包解压后的条目）。
package uploader

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"go.uber.org/zap"

	"bw-ai-check/backend/pkg/storage"
)

// Result 上传结果
type Result struct {
	Key          string // MinIO 存储 key
	URL          string // 公开访问 URL
	OriginalName string // 原始文件名
	Size         int64  // 实际字节数
	ContentType  string // MIME 类型
}

// Uploader 文件上传器
type Uploader struct {
	storage  storage.Storage
	maxBytes int64 // 0 表示不限制
	logger   *zap.Logger
}

// New 创建上传器
//
// maxSizeMB: 单文件最大 MB 数，0 表示不限制。
func New(stor storage.Storage, maxSizeMB int64, logger *zap.Logger) *Uploader {
	var maxBytes int64
	if maxSizeMB > 0 {
		maxBytes = maxSizeMB * 1024 * 1024
	}
	return &Uploader{
		storage:  stor,
		maxBytes: maxBytes,
		logger:   logger,
	}
}

// UploadFileHeader 上传 multipart 表单文件（单文件上传场景）。
// key 为存储路径，传空字符串时由 BuildKey 自动生成。
func (u *Uploader) UploadFileHeader(ctx context.Context, fh *multipart.FileHeader, key string) (*Result, error) {
	if u.maxBytes > 0 && fh.Size > u.maxBytes {
		return nil, fmt.Errorf("文件大小 %.1f MB 超出上限 %d MB",
			float64(fh.Size)/1024/1024, u.maxBytes/1024/1024)
	}

	f, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("读取上传文件失败: %w", err)
	}
	defer f.Close()

	// 读取前 512 字节用于 MIME 探测，然后拼回完整流
	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	contentType := http.DetectContentType(buf[:n])

	// 重新构造完整 reader（已读部分 + 剩余流）
	allData := make([]byte, fh.Size)
	copy(allData, buf[:n])
	remaining, err := readAll(f, allData[n:])
	if err != nil {
		return nil, fmt.Errorf("读取文件内容失败: %w", err)
	}
	totalSize := int64(n) + remaining

	if key == "" {
		key = BuildKey(fh.Filename)
	}

	url, err := u.storage.Upload(ctx, key, bytes.NewReader(allData[:totalSize]), totalSize, contentType)
	if err != nil {
		return nil, err
	}

	u.logger.Info("File uploaded",
		zap.String("key", key),
		zap.String("original", fh.Filename),
		zap.Int64("size", totalSize),
		zap.String("contentType", contentType),
	)

	return &Result{
		Key:          key,
		URL:          url,
		OriginalName: fh.Filename,
		Size:         totalSize,
		ContentType:  contentType,
	}, nil
}

// UploadBytes 上传字节流（压缩包解压条目场景）。
// key 为存储路径，传空字符串时由 BuildKey 自动生成。
func (u *Uploader) UploadBytes(ctx context.Context, data []byte, originalName, key string) (*Result, error) {
	size := int64(len(data))
	if u.maxBytes > 0 && size > u.maxBytes {
		return nil, fmt.Errorf("文件 %s 大小 %.1f MB 超出上限 %d MB",
			originalName, float64(size)/1024/1024, u.maxBytes/1024/1024)
	}

	contentType := http.DetectContentType(data)

	if key == "" {
		key = BuildKey(originalName)
	}

	url, err := u.storage.Upload(ctx, key, bytes.NewReader(data), size, contentType)
	if err != nil {
		return nil, err
	}

	u.logger.Info("Bytes uploaded",
		zap.String("key", key),
		zap.String("original", originalName),
		zap.Int64("size", size),
		zap.String("contentType", contentType),
	)

	return &Result{
		Key:          key,
		URL:          url,
		OriginalName: originalName,
		Size:         size,
		ContentType:  contentType,
	}, nil
}

// BuildKey 生成 MinIO 存储路径：{prefix}/{date}/{uuid}{ext}
func BuildKey(filename string) string {
	date := time.Now().Format("2006/01/02")
	ext := strings.ToLower(filepath.Ext(filename))
	id := fmt.Sprintf("%d", time.Now().UnixNano())
	return fmt.Sprintf("exam-papers/%s/%s%s", date, id, ext)
}

// BuildKeyWithOwner 生成带用户 ID 的存储路径：exam-papers/{userID}/{date}/{uuid}{ext}
func BuildKeyWithOwner(userID, filename string) string {
	date := time.Now().Format("2006/01/02")
	ext := strings.ToLower(filepath.Ext(filename))
	id := fmt.Sprintf("%d", time.Now().UnixNano())
	return fmt.Sprintf("exam-papers/%s/%s/%s%s", userID, date, id, ext)
}

// Delete 删除存储中的文件
func (u *Uploader) Delete(ctx context.Context, key string) error {
	return u.storage.Delete(ctx, key)
}

// GetObject 获取文件内容，调用方负责关闭返回的 ReadCloser
func (u *Uploader) GetObject(ctx context.Context, key string) (io.ReadCloser, int64, string, error) {
	return u.storage.GetObject(ctx, key)
}

// readAll 将 src 读入 dst，返回实际读取字节数
func readAll(src interface{ Read([]byte) (int, error) }, dst []byte) (int64, error) {
	total := 0
	for total < len(dst) {
		n, err := src.Read(dst[total:])
		total += n
		if err != nil {
			break
		}
	}
	return int64(total), nil
}
