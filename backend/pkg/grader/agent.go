// Package grader 提供 AI 智能阅卷功能。
// 流程：文档字节 → docparser 解析（文字+图片） → 多模态/文字模型 → 结构化 JSON 评分结果
package grader

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"bw-ai-check/backend/pkg/dashscope"
	"bw-ai-check/backend/pkg/docparser"
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
	AnswerCompletion string   `json:"answerCompletion"` // 完整正确答案
}

// GradingResult AI 阅卷结构化结果
type GradingResult struct {
	Questions  []QuestionResult `json:"questions"`
	TotalScore int              `json:"totalScore"`
	Summary    string           `json:"summary"`
	Method     string           `json:"method,omitempty"` // 使用的阅卷路径
}

// Agent AI 阅卷智能体，持有模型配置，封装所有阅卷逻辑
type Agent struct {
	client    *dashscope.Client
	modelName string
}

// New 创建阅卷智能体
// apiKey: 模型 API Key；baseURL: OpenAI 兼容接口地址（空时使用 DashScope 默认地址）；modelName: 模型型号
func New(apiKey, baseURL, modelName string) (*Agent, error) {
	if modelName == "" {
		return nil, fmt.Errorf("模型型号不能为空")
	}
	return &Agent{
		client:    dashscope.New(apiKey, baseURL),
		modelName: modelName,
	}, nil
}

// Grade 对答题文档进行阅卷，返回结构化评分结果。
// 主路径：docparser 解析文档 → 图文混合多模态消息 → 模型阅卷
// 降级路径：提取文档纯文字 → 文本消息 → 模型阅卷（截图内容无法评分）
func (a *Agent) Grade(fileBytes []byte, originalName string) (*GradingResult, error) {
	doc, err := docparser.Parse(fileBytes, originalName)
	if err != nil {
		return nil, fmt.Errorf("解析文档失败: %w", err)
	}
	if len(doc.Blocks) == 0 {
		return nil, fmt.Errorf("文档解析结果为空")
	}

	// 主路径：图文混合
	result, err := a.gradeMultimodal(doc)
	if err == nil {
		result.Method = "multimodal"
		return result, nil
	}

	// 降级路径：纯文字
	result, fallbackErr := a.gradeTextOnly(doc)
	if fallbackErr != nil {
		return nil, fmt.Errorf("图文混合阅卷失败（%w），纯文字阅卷也失败：%v", err, fallbackErr)
	}
	result.Method = "text-only"
	return result, nil
}

// gradeMultimodal 图文混合路径：按文档顺序将文字块+图片块组装为多模态消息发给模型
func (a *Agent) gradeMultimodal(doc *docparser.DocContent) (*GradingResult, error) {
	trimmed := trimHeaderBlocks(doc.Blocks)
	if len(trimmed) == 0 {
		return nil, fmt.Errorf("过滤页眉后文档内容为空")
	}

	blocks := make([]dashscope.MultimodalBlock, 0, len(trimmed))
	for _, b := range trimmed {
		switch b.Type {
		case docparser.BlockText:
			blocks = append(blocks, dashscope.MultimodalBlock{Type: dashscope.MBText, Text: b.Text})
		case docparser.BlockImage:
			blocks = append(blocks, dashscope.MultimodalBlock{Type: dashscope.MBImage, Image: b.Image})
		}
	}

	tailPrompt := "请根据以上文档内容（文字段落是题目，紧跟其后的图片是该题的代码截图答案），严格按照系统提示词的要求逐题阅卷，输出 JSON。"

	var resp *dashscope.ChatResponse
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		if attempt > 1 {
			time.Sleep(time.Duration(attempt) * time.Second)
		}
		resp, lastErr = a.client.ChatMultimodal(a.modelName, blocks, multimodalPrompt, tailPrompt, true)
		if lastErr == nil {
			break
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("多模态模型调用失败: %w", lastErr)
	}

	return ParseResult(resp.ReplyText())
}

// gradeTextOnly 纯文字降级路径：提取文档文字内容发给模型（截图部分无法评分）
func (a *Agent) gradeTextOnly(doc *docparser.DocContent) (*GradingResult, error) {
	var sb strings.Builder
	for _, b := range doc.Blocks {
		if b.Type == docparser.BlockText && strings.TrimSpace(b.Text) != "" {
			sb.WriteString(b.Text)
			sb.WriteString("\n")
		}
	}
	docText := strings.TrimSpace(sb.String())
	if docText == "" {
		return nil, fmt.Errorf("无法提取文档文字内容")
	}

	userPrompt := "请根据以下答题文档的文字内容完成阅卷。注意：图片截图内容在此路径不可见，仅凭文字答案评分。\n\n" +
		"【评分单元】每个带编号和分值的小项（如 `1. 定义…（4分）`）是独立评分单元，不是大题。\n\n" +
		"【答题文档内容】\n" + docText + "\n\n" +
		"按文档顺序找出每一个编号小项并逐项批改，严格输出如下 JSON，不要 markdown 代码块：\n" +
		`{"questions":[{"no":1,"title":"1. 小项原文（含分值，最多80字）","maxScore":4,"correctRate":80,"score":4,"errorPoints":[],"correctApproach":"...","answerCompletion":"..."}],"totalScore":4,"summary":"综合评价"}`

	var resp *dashscope.ChatResponse
	var lastErr error
	for attempt := 1; attempt <= 2; attempt++ {
		if attempt > 1 {
			time.Sleep(2 * time.Second)
		}
		resp, lastErr = a.client.ChatWithText(a.modelName, textOnlySysPrompt, userPrompt, true)
		if lastErr == nil {
			break
		}
	}
	if lastErr != nil {
		return nil, fmt.Errorf("文字模型调用失败: %w", lastErr)
	}

	return ParseResult(resp.ReplyText())
}

// trimHeaderBlocks 跳过页眉/考试说明：从第一张图片前面最近的文字块开始截取
func trimHeaderBlocks(blocks []docparser.ContentBlock) []docparser.ContentBlock {
	firstImgIdx := -1
	for i, b := range blocks {
		if b.Type == docparser.BlockImage {
			firstImgIdx = i
			break
		}
	}
	if firstImgIdx < 0 {
		return blocks
	}
	startIdx := firstImgIdx
	for i := firstImgIdx - 1; i >= 0; i-- {
		if blocks[i].Type == docparser.BlockText {
			startIdx = i
			break
		}
	}
	return blocks[startIdx:]
}

// ParseResult 从模型输出文本中提取并解析 JSON 评分结果（导出供外部复用）
func ParseResult(text string) (*GradingResult, error) {
	text = strings.TrimSpace(text)

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

	// 若所有题目 MaxScore 都为 0，按题目数均分 100 分
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
			q.MaxScore = 1 // 兜底最小值，保留 AI 给出的实际分值
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

	total := 0
	for _, q := range result.Questions {
		total += q.Score
	}
	result.TotalScore = total

	return &result, nil
}

// ---------- 提示词常量 ----------

const multimodalPrompt = `你是一位专业的程序设计课程阅卷助手。

【输入格式说明】
你将收到一份答题文档的内容，按文档原始顺序以「文字段落」和「截图」交替排列：
- 文字段落包含大题标题、编号小项要求和分值
- 每个编号小项的文字后面紧跟的截图是该小项的代码/答案截图
- 一个小项可能有多张截图（代码截图 + 运行结果截图）
- 重要：每张截图只属于它前面最近的那个小项，绝对不能跨项阅卷

【评分单元定义（关键）】
评分单元是「编号小项」，不是大题。
- 大题示例：「第一题：假设有一个购物车页面…」—— 不是评分单元，是背景说明
- 小项示例：「1. 定义一个空的购物车 Map（4 分）」「2. 程序提供四个功能（4 分）」—— 每个小项才是独立评分单元
- 若文档中没有编号小项，则把每道题作为评分单元

【第一步：识别所有编号小项】
按文档顺序，逐一找出所有带编号和分值的小项：
- no：小项的全局顺序编号（从 1 开始依次递增，贯穿全卷）
- title：逐字复制该小项的原始文字（含分值括注，最多 80 字，超出加"…"）
- maxScore：该小项括注的分值；若未标注则与其他同题小项均分大题总分

【第二步：逐项批改】
对照小项要求，查看该小项对应的截图（紧跟在小项文字后面的图片），判断：
- correctRate：正确率（0~100 整数，综合逻辑正确性、语法正确性、覆盖要求的程度）
- score：correctRate > 60 得满分（maxScore），否则得 0
- errorPoints：该小项的具体错误列表（无错误则 []）
- correctApproach：针对该小项的正确解题思路（1~2 句话）
- answerCompletion：该小项完整正确的代码答案

【输出格式】
严格输出以下 JSON，不得包含 markdown 代码块或其他文字：
{
  "questions": [
    {
      "no": 1,
      "title": "1. 定义一个空的购物车 Map（4 分）",
      "maxScore": 4,
      "correctRate": 90,
      "score": 4,
      "errorPoints": [],
      "correctApproach": "使用 map[string]int{} 定义空 Map",
      "answerCompletion": "m := map[string]int{}"
    },
    {
      "no": 2,
      "title": "2. 程序提供四个功能（4 分）",
      "maxScore": 4,
      "correctRate": 60,
      "score": 0,
      "errorPoints": ["缺少删除功能的实现"],
      "correctApproach": "使用 switch-case 实现四个功能分支",
      "answerCompletion": "..."
    }
  ],
  "totalScore": 4,
  "summary": "综合评价（100 字以内）"
}

强制规则：
- questions 数组的每个元素对应一个编号小项，不是大题
- no 从 1 开始全卷连续递增
- title 必须原文复制小项文字（含分值标注），不允许归纳改写
- maxScore 必须来自小项括注的分值，不能填大题总分
- score 只能是 0 或 maxScore，不能有中间值
- 每个小项只看它后面紧跟的截图，不能把其他小项的截图混入`

const textOnlySysPrompt = `你是一位专业的程序设计课程阅卷助手。评分单元是「编号小项」（如 1. 定义…（4分）），不是大题。请对每个编号小项单独评分，输出结构化 JSON 结果。`

// SystemPrompt 导出给外部使用（保持向后兼容）
const SystemPrompt = multimodalPrompt
