// Package grader 提供基于 Eino 框架的 AI 智能阅卷功能。
// 流程：文档页面图片 → qwen-vl-max 多模态视觉模型 → 结构化 JSON 评分结果
package grader

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	einoopenai "github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/schema"
)

// QuestionResult 单题评分结果
type QuestionResult struct {
	No               int      `json:"no"`
	Title            string   `json:"title"`
	MaxScore         int      `json:"maxScore"`
	CorrectRate      int      `json:"correctRate"`      // 0-100
	Score            int      `json:"score"`            // 0 或 maxScore（>60% 得满分）
	ErrorPoints      []string `json:"errorPoints"`      // 错误点列表
	CorrectApproach  string   `json:"correctApproach"`  // 正确实现思路
	AnswerCompletion string   `json:"answerCompletion"` // 基于学生截图的完整正确答案
}

// GradingResult AI 阅卷结构化结果
type GradingResult struct {
	Questions  []QuestionResult `json:"questions"`
	TotalScore int              `json:"totalScore"`
	Summary    string           `json:"summary"`
}

// Agent 基于 Eino 框架的阅卷智能体
type Agent struct {
	chatModel *einoopenai.ChatModel
	modelName string
}

const systemPrompt = `你是一位专业的程序设计课程阅卷助手。

【第一步：识别题目】
仔细阅读试卷图片，按卷面顺序找出每一道题目：
- no：题目序号（与卷面编号完全一致，如第1题填1，第2题填2）
- title：**逐字复制**卷面上该题的原始题目文字（不要缩写、不要改写、不要归纳，最多保留前80个字符，若原题更长则截取并在末尾加"…"）
- maxScore：若卷面明确标注了该题分值则使用卷面数字；若未标注则根据题目数量均分100分

【第二步：批改每道题】
对照题目要求与学生的代码/答案，判断：
- correctRate：学生答案的正确率（0~100整数，综合考虑逻辑正确性、语法正确性、覆盖题目要求的程度）
- score：若 correctRate > 90 则为满分（maxScore），否则为 0
- errorPoints：指出具体错误（若无错误则为空数组 []）
- correctApproach：简述正确的解题思路（1~3句话）
- answerCompletion：写出完整正确的代码答案（根据题目要求，而非猜测）

【输出格式要求】
严格输出以下 JSON，不得包含任何 markdown 代码块或其他文字：
{
  "questions": [
    {
      "no": 1,
      "title": "（从卷面逐字复制的原始题目，最多80字）",
      "maxScore": 20,
      "correctRate": 80,
      "score": 20,
      "errorPoints": ["具体错误"],
      "correctApproach": "正确思路",
      "answerCompletion": "完整正确代码"
    }
  ],
  "totalScore": 80,
  "summary": "综合评价（100字以内）"
}

强制规则：
- title 必须是原题文字的原文复制，绝对不允许自行归纳或改写
- no 必须与卷面编号一致，按顺序排列
- maxScore 必须来自卷面标注或均分推算，不得随意填 20
- score 只能是 0 或 maxScore，不能有中间值
- 若整张卷面未显示题目文字（如学生只截了代码），在 title 中注明"（题目文字不可见，仅按答案评分）"`

// New 创建阅卷智能体
// apiKey: 百炼 API Key; baseURL: DashScope compatible-mode 端点; modelName: 视觉模型名称
func New(apiKey, baseURL, modelName string) (*Agent, error) {
	if modelName == "" {
		modelName = "qwen-vl-max"
	}
	if baseURL == "" {
		baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
	}

	m, err := einoopenai.NewChatModel(context.Background(), &einoopenai.ChatModelConfig{
		APIKey:  apiKey,
		BaseURL: baseURL,
		Model:   modelName,
	})
	if err != nil {
		return nil, fmt.Errorf("初始化阅卷模型失败: %w", err)
	}
	return &Agent{chatModel: m, modelName: modelName}, nil
}

// Grade 对文档页面图片进行阅卷，返回结构化评分结果
// pageImages: 每元素为一页 PNG 的字节切片
func (a *Agent) Grade(ctx context.Context, pageImages [][]byte) (*GradingResult, error) {
	if len(pageImages) == 0 {
		return nil, fmt.Errorf("没有可阅卷的图片页")
	}

	// 构建多模态用户消息：所有图片在前，文字指令在后
	parts := make([]schema.ChatMessagePart, 0, len(pageImages)+1)
	for _, imgBytes := range pageImages {
		b64 := base64.StdEncoding.EncodeToString(imgBytes)
		parts = append(parts, schema.ChatMessagePart{
			Type:     schema.ChatMessagePartTypeImageURL,
			ImageURL: &schema.ChatMessageImageURL{URL: "data:image/png;base64," + b64},
		})
	}
	parts = append(parts, schema.ChatMessagePart{
		Type: schema.ChatMessagePartTypeText,
		Text: "请根据以上试卷图片完成阅卷，按要求输出 JSON 格式结果。",
	})

	messages := []*schema.Message{
		{Role: schema.System, Content: systemPrompt},
		{Role: schema.User, MultiContent: parts},
	}

	resp, err := a.chatModel.Generate(ctx, messages)
	if err != nil {
		return nil, fmt.Errorf("模型调用失败: %w", err)
	}

	return parseGradingResult(resp.Content)
}

// ParseResult 从模型输出文本中提取并解析 JSON 评分结果（导出供文本降级路径复用）
func ParseResult(text string) (*GradingResult, error) {
	return parseGradingResult(text)
}

// parseGradingResult 从模型输出文本中提取并解析 JSON 评分结果
func parseGradingResult(text string) (*GradingResult, error) {
	text = strings.TrimSpace(text)

	// 去除 markdown 代码块包裹（```json ... ``` 或 ``` ... ```）
	if idx := strings.Index(text, "```json"); idx >= 0 {
		text = text[idx+7:]
		if end := strings.LastIndex(text, "```"); end >= 0 {
			text = text[:end]
		}
	} else if strings.HasPrefix(text, "```") {
		text = strings.TrimPrefix(text, "```")
		if end := strings.LastIndex(text, "```"); end >= 0 {
			text = text[:end]
		}
	}

	// 提取 JSON 对象（找最外层 { } 包裹）
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start >= 0 && end > start {
		text = text[start : end+1]
	}
	text = strings.TrimSpace(text)

	var result GradingResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("解析阅卷 JSON 失败: %w\n原始输出: %.500s", err, text)
	}

	// 若所有题目 MaxScore 都为 0 或缺失，按题目数均分 100 分
	allZero := true
	for _, q := range result.Questions {
		if q.MaxScore > 0 {
			allZero = false
			break
		}
	}
	if allZero && len(result.Questions) > 0 {
		each := 100 / len(result.Questions)
		for i := range result.Questions {
			result.Questions[i].MaxScore = each
		}
	}

	// 强制执行评分规则：score 只能是 0 或 maxScore
	for i := range result.Questions {
		q := &result.Questions[i]
		if q.MaxScore <= 0 {
			q.MaxScore = 20 // 兜底
		}
		if q.CorrectRate > 60 {
			q.Score = q.MaxScore
		} else {
			q.Score = 0
		}
		if q.ErrorPoints == nil {
			q.ErrorPoints = []string{}
		}
	}

	// 重新计算总分（避免模型计算错误）
	total := 0
	for _, q := range result.Questions {
		total += q.Score
	}
	result.TotalScore = total

	return &result, nil
}
