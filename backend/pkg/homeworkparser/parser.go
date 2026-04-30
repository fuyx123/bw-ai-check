package homeworkparser

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/bzip2"
	"compress/gzip"
	"fmt"
	"io"
	"path/filepath"
	"sort"
	"strings"
	"unicode/utf8"

	"bw-ai-check/backend/pkg/docparser"
)

const (
	maxCodeFiles        = 12
	maxFileTreeEntries  = 80
	maxPerFileRunes     = 1200
	maxCodeSummaryRunes = 12000
	maxDocContentRunes  = 6000
)

var (
	codeExts = map[string]struct{}{
		".go": {}, ".js": {}, ".ts": {}, ".tsx": {}, ".jsx": {}, ".vue": {}, ".java": {},
		".py": {}, ".php": {}, ".rb": {}, ".c": {}, ".cpp": {}, ".cc": {}, ".h": {}, ".hpp": {},
		".cs": {}, ".rs": {}, ".swift": {}, ".kt": {}, ".sql": {}, ".sh": {}, ".yaml": {}, ".yml": {},
		".json": {}, ".xml": {}, ".html": {}, ".css": {}, ".scss": {}, ".less": {}, ".md": {},
	}
	docExts = map[string]struct{}{
		".doc": {}, ".docx": {}, ".md": {}, ".txt": {},
	}
)

// Result 压缩包解析结果
type Result struct {
	DocOriginalName string
	DocContent      string
	DocBytes        []byte
	CodeSummary     string
	FileTree        []string
	CodeFileCount   int
	Warnings        []string
}

type archiveEntry struct {
	Path    string
	Content []byte
}

type docCandidate struct {
	Path    string
	Content []byte
	Score   int
}

// ParseArchive 解析作业压缩包，提取文档与代码摘要。
func ParseArchive(content []byte, originalName string) (*Result, error) {
	entries, err := extractArchiveEntries(content, originalName)
	if err != nil {
		return nil, err
	}
	if len(entries) == 0 {
		return nil, fmt.Errorf("压缩包中未找到可解析文件")
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Path < entries[j].Path
	})

	result := &Result{
		FileTree: make([]string, 0, min(len(entries), maxFileTreeEntries)),
	}
	documents := make([]docCandidate, 0)
	codeSnippets := make([]string, 0, maxCodeFiles)
	totalRunes := 0

	for _, entry := range entries {
		if len(result.FileTree) < maxFileTreeEntries {
			result.FileTree = append(result.FileTree, entry.Path)
		}

		ext := strings.ToLower(filepath.Ext(entry.Path))
		if _, ok := docExts[ext]; ok {
			documents = append(documents, docCandidate{
				Path:    entry.Path,
				Content: entry.Content,
				Score:   scoreDocument(entry.Path),
			})
		}

		if _, ok := codeExts[ext]; !ok {
			continue
		}
		if !isTextLike(entry.Content) {
			continue
		}

		result.CodeFileCount++
		if len(codeSnippets) >= maxCodeFiles || totalRunes >= maxCodeSummaryRunes {
			continue
		}
		snippet := summarizeCodeFile(entry.Path, entry.Content)
		runes := utf8.RuneCountInString(snippet)
		if totalRunes+runes > maxCodeSummaryRunes {
			snippet = truncateRunes(snippet, maxCodeSummaryRunes-totalRunes)
			runes = utf8.RuneCountInString(snippet)
		}
		codeSnippets = append(codeSnippets, snippet)
		totalRunes += runes
	}

	if len(documents) == 0 {
		return nil, fmt.Errorf("压缩包中未找到作业文档，请至少包含 doc/docx/md/txt")
	}

	sort.Slice(documents, func(i, j int) bool {
		if documents[i].Score == documents[j].Score {
			return documents[i].Path < documents[j].Path
		}
		return documents[i].Score > documents[j].Score
	})
	if len(documents) > 1 {
		result.Warnings = append(result.Warnings, "检测到多份作业文档，系统已自动选择优先级最高的一份")
	}

	doc := documents[0]
	docContent, err := parseDocumentContent(doc.Content, doc.Path)
	if err != nil {
		return nil, fmt.Errorf("解析作业文档失败: %w", err)
	}
	if strings.TrimSpace(docContent) == "" {
		return nil, fmt.Errorf("作业文档内容为空")
	}

	result.DocOriginalName = doc.Path
	result.DocContent = truncateRunes(docContent, maxDocContentRunes)
	result.DocBytes = doc.Content

	var builder strings.Builder
	builder.WriteString("【文件树】\n")
	for _, path := range result.FileTree {
		builder.WriteString("- ")
		builder.WriteString(path)
		builder.WriteString("\n")
	}
	builder.WriteString("\n【代码摘要】\n")
	if len(codeSnippets) == 0 {
		builder.WriteString("未识别到可供审批的文本代码文件。\n")
	} else {
		for _, snippet := range codeSnippets {
			builder.WriteString(snippet)
			builder.WriteString("\n\n")
		}
	}
	result.CodeSummary = strings.TrimSpace(builder.String())
	return result, nil
}

func extractArchiveEntries(content []byte, originalName string) ([]archiveEntry, error) {
	lowerName := strings.ToLower(originalName)
	switch {
	case strings.HasSuffix(lowerName, ".zip"):
		return extractZIP(content)
	case strings.HasSuffix(lowerName, ".tar.gz"), strings.HasSuffix(lowerName, ".tgz"):
		gr, err := gzip.NewReader(bytes.NewReader(content))
		if err != nil {
			return nil, fmt.Errorf("打开 gzip 压缩包失败: %w", err)
		}
		defer gr.Close()
		return extractTAR(gr)
	case strings.HasSuffix(lowerName, ".tar.bz2"):
		return extractTAR(bzip2.NewReader(bytes.NewReader(content)))
	case strings.HasSuffix(lowerName, ".tar"):
		return extractTAR(bytes.NewReader(content))
	default:
		return nil, fmt.Errorf("暂不支持的压缩包格式: %s", originalName)
	}
}

func extractZIP(content []byte) ([]archiveEntry, error) {
	reader, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return nil, fmt.Errorf("读取 zip 失败: %w", err)
	}

	result := make([]archiveEntry, 0, len(reader.File))
	for _, file := range reader.File {
		if file.FileInfo().IsDir() {
			continue
		}
		rc, err := file.Open()
		if err != nil {
			return nil, fmt.Errorf("打开压缩文件失败: %w", err)
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			return nil, fmt.Errorf("读取压缩文件失败: %w", err)
		}
		result = append(result, archiveEntry{
			Path:    normalizeArchivePath(file.Name),
			Content: data,
		})
	}
	return result, nil
}

func extractTAR(reader io.Reader) ([]archiveEntry, error) {
	tr := tar.NewReader(reader)
	result := make([]archiveEntry, 0)
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("读取 tar 失败: %w", err)
		}
		if header.FileInfo().IsDir() {
			continue
		}
		data, err := io.ReadAll(tr)
		if err != nil {
			return nil, fmt.Errorf("读取 tar 文件内容失败: %w", err)
		}
		result = append(result, archiveEntry{
			Path:    normalizeArchivePath(header.Name),
			Content: data,
		})
	}
	return result, nil
}

func parseDocumentContent(content []byte, name string) (string, error) {
	ext := strings.ToLower(filepath.Ext(name))
	switch ext {
	case ".doc", ".docx":
		doc, err := docparser.Parse(content, name)
		if err != nil {
			return "", err
		}
		var builder strings.Builder
		for _, block := range doc.Blocks {
			if strings.TrimSpace(block.Text) == "" {
				continue
			}
			builder.WriteString(block.Text)
			builder.WriteString("\n")
		}
		return strings.TrimSpace(builder.String()), nil
	case ".md", ".txt":
		if !isTextLike(content) {
			return "", fmt.Errorf("文档不是有效的文本文件")
		}
		return strings.TrimSpace(string(content)), nil
	default:
		return "", fmt.Errorf("暂不支持的文档格式: %s", name)
	}
}

func scoreDocument(path string) int {
	lower := strings.ToLower(path)
	score := 0
	switch filepath.Ext(lower) {
	case ".docx":
		score += 50
	case ".doc":
		score += 45
	case ".md":
		score += 40
	case ".txt":
		score += 35
	}
	keywords := []string{"作业", "要求", "说明", "readme", "report", "文档"}
	for _, keyword := range keywords {
		if strings.Contains(lower, keyword) {
			score += 20
		}
	}
	if strings.Count(lower, "/") == 0 {
		score += 10
	}
	return score
}

func summarizeCodeFile(path string, content []byte) string {
	text := string(content)
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = truncateRunes(text, maxPerFileRunes)
	return fmt.Sprintf("### %s\n%s", path, strings.TrimSpace(text))
}

func normalizeArchivePath(path string) string {
	path = strings.TrimSpace(strings.ReplaceAll(path, "\\", "/"))
	path = strings.TrimPrefix(path, "./")
	return path
}

func isTextLike(content []byte) bool {
	if len(content) == 0 {
		return true
	}
	sample := content
	if len(sample) > 4096 {
		sample = sample[:4096]
	}
	return utf8.Valid(sample) && !bytes.Contains(sample, []byte{0})
}

func truncateRunes(text string, limit int) string {
	if limit <= 0 {
		return ""
	}
	runes := []rune(text)
	if len(runes) <= limit {
		return text
	}
	return string(runes[:limit]) + "\n...（内容已截断）"
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
