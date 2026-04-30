// Package dashscope 封装阿里云 DashScope / 百炼 OpenAI-Compatible 接口
// 文档: https://help.aliyun.com/zh/model-studio/developer-reference/compatible-mode
package dashscope

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"time"
)

const (
	defaultBaseURL    = "https://dashscope.aliyuncs.com/compatible-mode/v1"
	defaultTimeoutSec = 180
)

// Client DashScope HTTP 客户端
type Client struct {
	apiKey  string
	baseURL string
	http    *http.Client
}

// New 创建 DashScope 客户端
// apiKey: 百炼 API Key (sk-xxx)
// baseURL: 可选，传空串时使用默认值
func New(apiKey, baseURL string) *Client {
	if baseURL == "" {
		baseURL = defaultBaseURL
	}
	return &Client{
		apiKey:  apiKey,
		baseURL: baseURL,
		http:    &http.Client{Timeout: defaultTimeoutSec * time.Second},
	}
}

// ---------- 文件上传 ----------

// UploadFileResponse DashScope 文件上传响应
type UploadFileResponse struct {
	ID       string `json:"id"` // file_id，格式 file-xxxx
	Filename string `json:"filename"`
	Purpose  string `json:"purpose"`
	Bytes    int64  `json:"bytes"`
}

// UploadFile 将文件内容上传到 DashScope，返回 file_id。
// purpose 固定为 "file-extract"（用于文档内容抽取/阅读）。
func (c *Client) UploadFile(filename string, content []byte) (*UploadFileResponse, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	if err := writer.WriteField("purpose", "file-extract"); err != nil {
		return nil, err
	}

	part, err := writer.CreateFormFile("file", filepath.Base(filename))
	if err != nil {
		return nil, err
	}
	if _, err = io.Copy(part, bytes.NewReader(content)); err != nil {
		return nil, err
	}
	writer.Close()

	req, err := http.NewRequest(http.MethodPost, c.baseURL+"/files", body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("上传文件到 DashScope 失败: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("DashScope 文件上传错误 %d: %s", resp.StatusCode, string(raw))
	}

	var result UploadFileResponse
	if err = json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("解析文件上传响应失败: %w", err)
	}
	return &result, nil
}

// ---------- 对话生成公共结构 ----------

// ChatResponse /chat/completions 响应（文本和视觉模型通用）
type ChatResponse struct {
	ID      string `json:"id"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// ReplyText 返回第一个 choice 的文本内容
func (r *ChatResponse) ReplyText() string {
	if len(r.Choices) == 0 {
		return ""
	}
	return r.Choices[0].Message.Content
}

// doChat 统一发送 /chat/completions 请求
func (c *Client) doChat(payload any) (*ChatResponse, error) {
	return c.doChatWithContext(context.Background(), payload)
}

// doChatWithContext 使用指定上下文发送 /chat/completions 请求。
func (c *Client) doChatWithContext(ctx context.Context, payload any) (*ChatResponse, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("调用 DashScope 对话接口失败: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("DashScope 对话错误 %d: %s", resp.StatusCode, string(raw))
	}

	var result ChatResponse
	if err = json.Unmarshal(raw, &result); err != nil {
		return nil, fmt.Errorf("解析对话响应失败: %w", err)
	}
	if result.Error != nil {
		return nil, fmt.Errorf("DashScope API 错误 [%s]: %s", result.Error.Code, result.Error.Message)
	}
	return &result, nil
}

// ---------- 文本模型：qwen-long + fileid:// ----------

// textMessage 纯文本消息（content 为字符串）
type textMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// textChatRequest 文本模型请求体
type textChatRequest struct {
	Model          string          `json:"model"`
	Messages       []textMessage   `json:"messages"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

type responseFormat struct {
	Type string `json:"type"`
}

// ChatWithFile 使用 fileid 调用文本模型进行文档分析（qwen-long，仅 DashScope 支持）。
// forceJSON 为 true 时设置 response_format=json_object，强制模型输出合法 JSON。
func (c *Client) ChatWithFile(model, fileID, prompt string, forceJSON bool) (*ChatResponse, error) {
	payload := textChatRequest{
		Model: model,
		Messages: []textMessage{
			{Role: "system", Content: "fileid://" + fileID},
			{Role: "user", Content: prompt},
		},
	}
	if forceJSON {
		payload.ResponseFormat = &responseFormat{Type: "json_object"}
	}
	return c.doChat(payload)
}

// ChatWithText 发送纯文本消息给任意 OpenAI 兼容模型（不依赖文件上传，兼容 Claude/GPT 等所有模型）。
// forceJSON 为 true 时设置 response_format=json_object（部分模型不支持时会忽略）。
func (c *Client) ChatWithText(model, systemPrompt, userPrompt string, forceJSON bool) (*ChatResponse, error) {
	return c.ChatWithTextContext(context.Background(), model, systemPrompt, userPrompt, forceJSON)
}

// ChatWithTextContext 使用上下文发送纯文本消息，便于调用方控制单次超时。
func (c *Client) ChatWithTextContext(
	ctx context.Context,
	model, systemPrompt, userPrompt string,
	forceJSON bool,
) (*ChatResponse, error) {
	payload := textChatRequest{
		Model: model,
		Messages: []textMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
	}
	if forceJSON {
		payload.ResponseFormat = &responseFormat{Type: "json_object"}
	}
	return c.doChatWithContext(ctx, payload)
}

// ---------- 视觉模型：qwen-vl-max + base64 图片 ----------

// visionContentItem 多模态消息的内容项（文字或图片）
type visionContentItem struct {
	Type     string          `json:"type"`
	Text     string          `json:"text,omitempty"`
	ImageURL *visionImageURL `json:"image_url,omitempty"`
}

type visionImageURL struct {
	// base64 data URI 或公网 URL
	URL string `json:"url"`
}

// visionMessage 多模态消息（content 为数组）
type visionMessage struct {
	Role    string              `json:"role"`
	Content []visionContentItem `json:"content"`
}

// visionChatRequest 视觉模型请求体
type visionChatRequest struct {
	Model          string          `json:"model"`
	Messages       []visionMessage `json:"messages"`
	ResponseFormat *responseFormat `json:"response_format,omitempty"`
}

// MultimodalBlockType 多模态内容块类型
type MultimodalBlockType int

const (
	MBText  MultimodalBlockType = iota // 文字块
	MBImage                            // 图片块
)

// MultimodalBlock 多模态内容块（文字或图片）
type MultimodalBlock struct {
	Type     MultimodalBlockType
	Text     string // MBText 时为段落文字
	Image    []byte // MBImage 时为图片原始字节
	MimeType string // 图片 MIME（默认 image/png）
}

// ChatMultimodal 按顺序发送文字块+图片块给多模态视觉模型。
// systemPrompt: 系统指令；tailPrompt: 追加在末尾的阅卷指令；forceJSON: 强制 JSON 输出。
func (c *Client) ChatMultimodal(model string, blocks []MultimodalBlock,
	systemPrompt, tailPrompt string, forceJSON bool) (*ChatResponse, error) {

	userContent := make([]visionContentItem, 0, len(blocks)+1)
	for _, b := range blocks {
		switch b.Type {
		case MBText:
			userContent = append(userContent, visionContentItem{
				Type: "text",
				Text: b.Text,
			})
		case MBImage:
			mime := b.MimeType
			if mime == "" {
				mime = "image/png"
			}
			b64 := base64.StdEncoding.EncodeToString(b.Image)
			userContent = append(userContent, visionContentItem{
				Type:     "image_url",
				ImageURL: &visionImageURL{URL: "data:" + mime + ";base64," + b64},
			})
		}
	}
	// 末尾追加阅卷指令
	if tailPrompt != "" {
		userContent = append(userContent, visionContentItem{
			Type: "text",
			Text: tailPrompt,
		})
	}

	payload := visionChatRequest{
		Model: model,
		Messages: []visionMessage{
			{
				Role:    "system",
				Content: []visionContentItem{{Type: "text", Text: systemPrompt}},
			},
			{
				Role:    "user",
				Content: userContent,
			},
		},
	}
	if forceJSON {
		payload.ResponseFormat = &responseFormat{Type: "json_object"}
	}
	return c.doChat(payload)
}

// ChatWithImages 将多张 PNG 图片（文档页面）以 base64 格式发送给视觉模型进行阅卷。
// pageImages: 每个元素是一页的 PNG 字节；prompt: 阅卷要求。
func (c *Client) ChatWithImages(model string, pageImages [][]byte, prompt string) (*ChatResponse, error) {
	// 构建用户消息的内容数组：图片在前，文字提示在后
	userContent := make([]visionContentItem, 0, len(pageImages)+1)
	for _, imgBytes := range pageImages {
		b64 := base64.StdEncoding.EncodeToString(imgBytes)
		userContent = append(userContent, visionContentItem{
			Type:     "image_url",
			ImageURL: &visionImageURL{URL: "data:image/png;base64," + b64},
		})
	}
	userContent = append(userContent, visionContentItem{
		Type: "text",
		Text: prompt,
	})

	payload := visionChatRequest{
		Model: model,
		Messages: []visionMessage{
			{
				Role: "system",
				Content: []visionContentItem{
					{Type: "text", Text: "你是一位专业的阅卷助手，擅长分析代码截图，能够识别语法错误和逻辑问题，请根据试题要求和答题截图进行评分和详细批注。"},
				},
			},
			{
				Role:    "user",
				Content: userContent,
			},
		},
	}
	return c.doChat(payload)
}
