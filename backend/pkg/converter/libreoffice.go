// Package converter 提供文档格式转换工具
package converter

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

// ErrNotAvailable 表示转换工具（LibreOffice）未安装
var ErrNotAvailable = fmt.Errorf("LibreOffice 未安装，无法进行文档转换")

// candidatePaths 按优先级列出 LibreOffice 可执行文件路径
var candidatePaths = []string{
	"libreoffice",
	"soffice",
	"/usr/bin/libreoffice",
	"/usr/bin/soffice",
	"/usr/local/bin/libreoffice",
	"/usr/local/bin/soffice",
	"/opt/homebrew/bin/libreoffice",
	"/opt/homebrew/bin/soffice",
	"/Applications/LibreOffice.app/Contents/MacOS/soffice",
}

// findLibreOffice 返回可用的 LibreOffice 可执行文件路径
func findLibreOffice() (string, error) {
	for _, p := range candidatePaths {
		if path, err := exec.LookPath(p); err == nil {
			return path, nil
		}
		if _, err := os.Stat(p); err == nil {
			return p, nil
		}
	}
	return "", ErrNotAvailable
}

// DocToDocx 将 .doc 文件内容转换为 .docx，返回结果字节流。
// 若 LibreOffice 未安装，返回 ErrNotAvailable。
func DocToDocx(docReader io.Reader, originalName string) ([]byte, error) {
	sofficePath, err := findLibreOffice()
	if err != nil {
		return nil, ErrNotAvailable
	}

	tmpDir, err := os.MkdirTemp("", "doc-convert-*")
	if err != nil {
		return nil, fmt.Errorf("创建临时目录失败: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	ext := strings.ToLower(filepath.Ext(originalName))
	if ext == "" {
		ext = ".doc"
	}
	inputPath := filepath.Join(tmpDir, "input"+ext)

	inputFile, err := os.Create(inputPath)
	if err != nil {
		return nil, fmt.Errorf("创建临时文件失败: %w", err)
	}
	if _, err = io.Copy(inputFile, docReader); err != nil {
		inputFile.Close()
		return nil, fmt.Errorf("写入临时文件失败: %w", err)
	}
	inputFile.Close()

	cmd := exec.Command(
		sofficePath,
		"--headless",
		"--convert-to", "docx",
		"--outdir", tmpDir,
		inputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("LibreOffice 转换失败: %v\n%s", err, string(output))
	}

	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	outputPath := filepath.Join(tmpDir, baseName+".docx")

	data, err := os.ReadFile(outputPath)
	if err != nil {
		return nil, fmt.Errorf("读取转换结果失败: %w", err)
	}

	return data, nil
}

// DocToImages 将 Word 文档（.doc / .docx）每页转换为 PNG 字节切片列表。
// 优先走 doc → PDF → 逐页 PNG（支持多页），降级走 LibreOffice 直接 PNG（仅首页）。
// maxPages 限制最多转换的页数，传 0 表示不限制。
func DocToImages(content []byte, originalName string, maxPages int) ([][]byte, error) {
	sofficePath, err := findLibreOffice()
	if err != nil {
		return nil, ErrNotAvailable
	}

	tmpDir, err := os.MkdirTemp("", "doc-img-*")
	if err != nil {
		return nil, fmt.Errorf("创建临时目录失败: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	ext := strings.ToLower(filepath.Ext(originalName))
	if ext == "" {
		ext = ".docx"
	}
	inputPath := filepath.Join(tmpDir, "input"+ext)
	if err := os.WriteFile(inputPath, content, 0o600); err != nil {
		return nil, fmt.Errorf("写入临时文件失败: %w", err)
	}

	// 优先：doc → PDF → 逐页 PNG（多页支持）
	if images, pdfErr := convertViaPDF(sofficePath, tmpDir, inputPath, maxPages); pdfErr == nil && len(images) > 0 {
		return images, nil
	}

	// 降级：LibreOffice 直接转 PNG（仅首页，但保证可用）
	return convertDirectPNG(sofficePath, tmpDir, inputPath, maxPages)
}

// convertViaPDF 先转 PDF（保留全部页面），再用外部工具逐页导出 PNG
func convertViaPDF(sofficePath, tmpDir, inputPath string, maxPages int) ([][]byte, error) {
	pdfDir := filepath.Join(tmpDir, "pdf")
	if err := os.MkdirAll(pdfDir, 0o755); err != nil {
		return nil, err
	}

	cmd := exec.Command(sofficePath, "--headless", "--convert-to", "pdf", "--outdir", pdfDir, inputPath)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("LibreOffice 转PDF失败: %v\n%s", err, string(out))
	}

	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	pdfPath := filepath.Join(pdfDir, baseName+".pdf")
	if _, err := os.Stat(pdfPath); err != nil {
		return nil, fmt.Errorf("PDF文件不存在: %w", err)
	}

	pngDir := filepath.Join(tmpDir, "pages")
	if err := os.MkdirAll(pngDir, 0o755); err != nil {
		return nil, err
	}

	// 优先 pdftoppm（poppler-utils），200 DPI，多页逐张输出
	if bin, err := exec.LookPath("pdftoppm"); err == nil {
		if images, err := pdfViaPdftoppm(bin, pdfPath, pngDir, maxPages); err == nil {
			return images, nil
		}
	}

	// 备选 Ghostscript
	for _, name := range []string{"gs", "gswin64c"} {
		if bin, err := exec.LookPath(name); err == nil {
			if images, err := pdfViaGhostscript(bin, pdfPath, pngDir, maxPages); err == nil {
				return images, nil
			}
		}
	}

	return nil, fmt.Errorf("未找到 PDF→PNG 工具（可安装 poppler 或 ghostscript）")
}

func pdfViaPdftoppm(bin, pdfPath, outDir string, maxPages int) ([][]byte, error) {
	args := []string{"-png", "-r", "200"}
	if maxPages > 0 {
		args = append(args, "-l", fmt.Sprintf("%d", maxPages))
	}
	args = append(args, pdfPath, filepath.Join(outDir, "page"))

	cmd := exec.Command(bin, args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("pdftoppm 失败: %v\n%s", err, string(out))
	}
	return collectPNGs(outDir, maxPages)
}

func pdfViaGhostscript(bin, pdfPath, outDir string, maxPages int) ([][]byte, error) {
	outPattern := filepath.Join(outDir, "page-%03d.png")
	args := []string{
		"-dNOPAUSE", "-dBATCH", "-dQUIET",
		"-sDEVICE=png16m", "-r200",
		fmt.Sprintf("-sOutputFile=%s", outPattern),
	}
	if maxPages > 0 {
		args = append(args, fmt.Sprintf("-dLastPage=%d", maxPages))
	}
	args = append(args, pdfPath)

	cmd := exec.Command(bin, args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("ghostscript 失败: %v\n%s", err, string(out))
	}
	return collectPNGs(outDir, maxPages)
}

// convertDirectPNG LibreOffice 直接转 PNG（仅首页，作为终极降级）
func convertDirectPNG(sofficePath, tmpDir, inputPath string, maxPages int) ([][]byte, error) {
	cmd := exec.Command(sofficePath, "--headless", "--convert-to", "png", "--outdir", tmpDir, inputPath)
	if out, err := cmd.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("LibreOffice 转图失败: %v\n%s", err, string(out))
	}
	return collectPNGs(tmpDir, maxPages)
}

// collectPNGs 收集目录下所有 PNG，按文件名排序
func collectPNGs(dir string, maxPages int) ([][]byte, error) {
	entries, err := filepath.Glob(filepath.Join(dir, "*.png"))
	if err != nil || len(entries) == 0 {
		return nil, fmt.Errorf("未找到转换后的图片文件")
	}
	sort.Strings(entries)

	if maxPages > 0 && len(entries) > maxPages {
		entries = entries[:maxPages]
	}

	images := make([][]byte, 0, len(entries))
	for _, p := range entries {
		data, readErr := os.ReadFile(p)
		if readErr != nil {
			return nil, fmt.Errorf("读取图片 %s 失败: %w", p, readErr)
		}
		images = append(images, data)
	}
	return images, nil
}
