// Package docparser 按文档顺序解析 .docx，输出文字块和图片块交替排列的序列。
// .doc 格式先通过 LibreOffice 转为 .docx 再解析。
package docparser

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"bw-ai-check/backend/pkg/converter"
)

// BlockType 内容块类型
type BlockType int

const (
	BlockText  BlockType = iota // 文字段落
	BlockImage                  // 嵌入图片
)

// ContentBlock 文档内容块（文字或图片，按文档顺序排列）
type ContentBlock struct {
	Type  BlockType
	Text  string // BlockText 时为段落文字
	Image []byte // BlockImage 时为图片原始字节
}

// DocContent 文档解析结果（保留文档原始顺序）
type DocContent struct {
	Blocks []ContentBlock
}

// HasImages 是否包含嵌入图片
func (d *DocContent) HasImages() bool {
	for _, b := range d.Blocks {
		if b.Type == BlockImage {
			return true
		}
	}
	return false
}

// Parse 按文档顺序解析 Word，返回交替排列的文字/图片块序列。
// .doc 格式先通过 LibreOffice 转 .docx 再解析。
func Parse(content []byte, originalName string) (*DocContent, error) {
	ext := strings.ToLower(filepath.Ext(originalName))

	// .doc -> .docx 转换
	if ext == ".doc" {
		docxBytes, err := converter.DocToDocx(bytes.NewReader(content), originalName)
		if err != nil {
			return nil, fmt.Errorf("doc 转 docx 失败: %w", err)
		}
		content = docxBytes
	}

	return parseDocx(content)
}

// parseDocx 解析 .docx（ZIP 压缩包）提取有序内容块
func parseDocx(content []byte) (*DocContent, error) {
	reader, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return nil, fmt.Errorf("打开 docx 失败: %w", err)
	}

	// 1. 读取所有 media 文件到内存
	mediaFiles := make(map[string][]byte)
	for _, f := range reader.File {
		if strings.HasPrefix(f.Name, "word/media/") {
			data, readErr := readZipEntry(f)
			if readErr != nil {
				continue
			}
			mediaFiles[f.Name] = data
		}
	}

	// 2. 解析 rels 建立 rId -> 图片路径 映射
	relMap := make(map[string]string) // rId -> "word/media/image1.png"
	for _, f := range reader.File {
		if f.Name == "word/_rels/document.xml.rels" {
			data, readErr := readZipEntry(f)
			if readErr != nil {
				break
			}
			relMap = parseRels(data)
			break
		}
	}

	// 3. 按顺序解析 document.xml
	var docXML []byte
	for _, f := range reader.File {
		if f.Name == "word/document.xml" {
			docXML, err = readZipEntry(f)
			if err != nil {
				return nil, fmt.Errorf("读取 document.xml 失败: %w", err)
			}
			break
		}
	}
	if docXML == nil {
		return nil, fmt.Errorf("docx 中未找到 word/document.xml")
	}

	blocks := extractBlocks(docXML, relMap, mediaFiles)

	// 合并连续空文字块
	blocks = mergeBlocks(blocks)

	return &DocContent{Blocks: blocks}, nil
}

// ---- rels 解析 ----

type relsXML struct {
	Relationships []relEntry `xml:"Relationship"`
}

type relEntry struct {
	ID     string `xml:"Id,attr"`
	Target string `xml:"Target,attr"`
	Type   string `xml:"Type,attr"`
}

func parseRels(data []byte) map[string]string {
	var rels relsXML
	if err := xml.Unmarshal(data, &rels); err != nil {
		return nil
	}
	m := make(map[string]string, len(rels.Relationships))
	for _, r := range rels.Relationships {
		if strings.Contains(r.Type, "image") {
			target := r.Target
			if !strings.HasPrefix(target, "word/") {
				target = "word/" + target
			}
			m[r.ID] = target
		}
	}
	return m
}

// ---- document.xml 流式解析 ----

func extractBlocks(docXML []byte, relMap map[string]string, mediaFiles map[string][]byte) []ContentBlock {
	decoder := xml.NewDecoder(bytes.NewReader(docXML))
	var blocks []ContentBlock

	// 逐段落解析：跟踪当前是否在 <w:p> 内
	var inParagraph bool
	var paraText strings.Builder
	var paraImages [][]byte

	for {
		tok, err := decoder.Token()
		if err != nil {
			break
		}

		switch t := tok.(type) {
		case xml.StartElement:
			switch t.Name.Local {
			case "p":
				if t.Name.Space == "http://schemas.openxmlformats.org/wordprocessingml/2006/main" || isWordNS(t.Name.Space) {
					inParagraph = true
					paraText.Reset()
					paraImages = nil
				}

			case "t":
				if inParagraph && isWordNS(t.Name.Space) {
					var text string
					if err := decoder.DecodeElement(&text, &t); err == nil {
						paraText.WriteString(text)
					}
				}

			case "blip":
				if !inParagraph {
					break
				}
				rID := getAttr(t.Attr, "embed")
				if rID == "" {
					break
				}
				imgPath, ok := relMap[rID]
				if !ok {
					break
				}
				imgData, ok := mediaFiles[imgPath]
				if !ok {
					break
				}
				if isImageContent(imgData) {
					paraImages = append(paraImages, imgData)
				}

			case "imagedata":
				// VML 格式 (<v:imagedata r:id="rIdX"/>)
				if !inParagraph {
					break
				}
				rID := getAttr(t.Attr, "id")
				if rID == "" {
					break
				}
				imgPath, ok := relMap[rID]
				if !ok {
					break
				}
				imgData, ok := mediaFiles[imgPath]
				if !ok {
					break
				}
				if isImageContent(imgData) {
					paraImages = append(paraImages, imgData)
				}
			}

		case xml.EndElement:
			if t.Name.Local == "p" && inParagraph {
				// 段落结束：按出现顺序输出文字块和图片块
				text := strings.TrimSpace(paraText.String())
				if text != "" {
					blocks = append(blocks, ContentBlock{Type: BlockText, Text: text})
				}
				for _, img := range paraImages {
					blocks = append(blocks, ContentBlock{Type: BlockImage, Image: img})
				}
				inParagraph = false
			}
		}
	}

	return blocks
}

func isWordNS(ns string) bool {
	return ns == "http://schemas.openxmlformats.org/wordprocessingml/2006/main" ||
		strings.HasSuffix(ns, "/wordprocessingml/2006/main")
}

func getAttr(attrs []xml.Attr, localName string) string {
	for _, a := range attrs {
		if a.Name.Local == localName {
			return a.Value
		}
	}
	return ""
}

func isImageContent(data []byte) bool {
	ct := http.DetectContentType(data)
	return strings.HasPrefix(ct, "image/")
}

// mergeBlocks 合并连续空文字块，将相邻文字块用换行合并
func mergeBlocks(blocks []ContentBlock) []ContentBlock {
	if len(blocks) == 0 {
		return blocks
	}

	merged := make([]ContentBlock, 0, len(blocks))
	for _, b := range blocks {
		if b.Type == BlockText && b.Text == "" {
			continue
		}
		// 合并相邻文字块
		if b.Type == BlockText && len(merged) > 0 && merged[len(merged)-1].Type == BlockText {
			merged[len(merged)-1].Text += "\n" + b.Text
			continue
		}
		merged = append(merged, b)
	}
	return merged
}

// ---- 工具函数 ----

func readZipEntry(f *zip.File) ([]byte, error) {
	rc, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(rc)
}
