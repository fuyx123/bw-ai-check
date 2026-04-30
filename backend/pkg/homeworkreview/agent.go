package homeworkreview

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"bw-ai-check/backend/pkg/dashscope"
)

// RequirementMatch 作业要求匹配结果
type RequirementMatch struct {
	Requirement string `json:"requirement"`
	Status      string `json:"status"`
	Evidence    string `json:"evidence"`
}

// Issue 审批发现的问题
type Issue struct {
	Severity   string `json:"severity"`
	Category   string `json:"category"`
	Title      string `json:"title"`
	FilePath   string `json:"filePath"`
	LineHint   string `json:"lineHint"`
	Detail     string `json:"detail"`
	Suggestion string `json:"suggestion"`
}

// KnowledgePoint 知识点掌握情况
type KnowledgePoint struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	Evidence string `json:"evidence"`
}

// Result AI 审批结构化结果
type Result struct {
	Passed             bool               `json:"passed"`
	Score              int                `json:"score"`
	Summary            string             `json:"summary"`
	RequirementMatches []RequirementMatch `json:"requirementMatches"`
	Issues             []Issue            `json:"issues"`
	KnowledgePoints    []KnowledgePoint   `json:"knowledgePoints"`
	OverallSuggestions []string           `json:"overallSuggestions"`
}

// Agent 作业审批智能体
type Agent struct {
	client    *dashscope.Client
	modelName string
}

const (
	reviewSingleTimeout = 20 * time.Second
	reviewTotalTimeout  = 70 * time.Second
)

func New(apiKey, baseURL, modelName string) (*Agent, error) {
	if strings.TrimSpace(modelName) == "" {
		return nil, fmt.Errorf("模型名称不能为空")
	}
	return &Agent{
		client:    dashscope.New(apiKey, baseURL),
		modelName: modelName,
	}, nil
}

// Review 根据作业文档和代码摘要生成结构化审批结果。
func (a *Agent) Review(docContent, codeSummary string) (*Result, error) {
	if strings.TrimSpace(docContent) == "" {
		return nil, fmt.Errorf("作业文档内容不能为空")
	}
	if strings.TrimSpace(codeSummary) == "" {
		return nil, fmt.Errorf("代码摘要不能为空")
	}

	prompts := []struct {
		name     string
		prompt   string
		attempts int
	}{
		{name: "compact", prompt: buildCompactPrompt(docContent, codeSummary), attempts: 2},
		{name: "full", prompt: buildUserPrompt(docContent, codeSummary), attempts: 1},
	}

	var lastErr error
	reviewCtx, cancel := context.WithTimeout(context.Background(), reviewTotalTimeout)
	defer cancel()

	for promptIndex, promptPlan := range prompts {
		for attempt := 1; attempt <= promptPlan.attempts; attempt++ {
			if err := reviewCtx.Err(); err != nil {
				lastErr = fmt.Errorf("审批总超时: %w", err)
				break
			}
			if attempt > 1 || promptIndex > 0 {
				time.Sleep(time.Duration(attempt+promptIndex) * time.Second)
			}
			attemptCtx, attemptCancel := context.WithTimeout(reviewCtx, reviewSingleTimeout)
			resp, err := a.client.ChatWithTextContext(attemptCtx, a.modelName, systemPrompt, promptPlan.prompt, true)
			attemptCancel()
			if err != nil {
				lastErr = wrapReviewError(err)
				continue
			}
			result, err := ParseResult(resp.ReplyText())
			if err != nil {
				lastErr = err
				continue
			}
			if err := validateResultQuality(result); err != nil {
				lastErr = err
				continue
			}
			return result, nil
		}
	}
	return nil, fmt.Errorf("调用审批模型失败: %w", lastErr)
}

func wrapReviewError(err error) error {
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		return fmt.Errorf("单次审批请求超时: %w", err)
	case errors.Is(err, context.Canceled):
		return fmt.Errorf("审批请求已取消: %w", err)
	default:
		return err
	}
}

func validateResultQuality(result *Result) error {
	if result == nil {
		return fmt.Errorf("审批结果为空")
	}
	if strings.TrimSpace(result.Summary) == "" {
		return fmt.Errorf("审批结果缺少摘要")
	}
	if len(result.RequirementMatches) == 0 {
		return fmt.Errorf("审批结果缺少要求匹配项")
	}
	if len(result.KnowledgePoints) < 2 {
		return fmt.Errorf("审批结果缺少足够的知识点分析")
	}
	if len(result.OverallSuggestions) == 0 && len(result.Issues) == 0 {
		return fmt.Errorf("审批结果信息不足")
	}
	return nil
}

// ParseResult 解析模型输出的 JSON 结果。
func ParseResult(text string) (*Result, error) {
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

	var result Result
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		return nil, fmt.Errorf("解析审批结果失败: %w", err)
	}
	if strings.TrimSpace(result.Summary) == "" {
		result.Summary = "模型已完成审批，但未返回摘要"
	}
	if result.Score < 0 {
		result.Score = 0
	}
	if result.Score > 100 {
		result.Score = 100
	}
	normalizeResult(&result)
	return &result, nil
}

const systemPrompt = `你是高校作业审批助手，需要根据“作业要求”和“学生提交的代码摘要”给出严格、客观、可执行的审核结果。

输出要求：
1. 只能输出 JSON，不要输出 markdown。
2. 严格使用如下结构：
{
  "passed": true,
  "score": 85,
  "summary": "总体结论",
  "requirementMatches": [
    {"requirement":"要求点","status":"matched|partial|missing","evidence":"证据说明"}
  ],
  "issues": [
    {
      "severity":"high|medium|low",
      "category":"requirement|logic|quality|document|structure|knowledge|other",
      "title":"问题标题",
      "filePath":"涉及文件路径",
      "lineHint":"行号或位置提示，没有就写空字符串",
      "detail":"问题说明",
      "suggestion":"修改建议"
    }
  ],
  "knowledgePoints": [
    {
      "name":"知识点名称",
      "status":"mastered|partial|weak",
      "evidence":"掌握情况说明"
    }
  ],
  "overallSuggestions":["总体建议1","总体建议2"]
}
3. 如果代码中没有找到任何有效实现，请明确判定为不通过。
4. requirementMatches 必须尽量覆盖文档中的核心要求，issues 只写真正的问题，不要凑数。
5. knowledgePoints 至少提炼 3 个与本次作业直接相关的核心知识点，并标记掌握情况。`

func buildUserPrompt(docContent, codeSummary string) string {
	return "【作业要求】\n" + docContent + "\n\n【学生代码摘要】\n" + codeSummary
}

func buildCompactPrompt(docContent, codeSummary string) string {
	return "【作业要求（精简版）】\n" + truncateRunes(docContent, 2500) +
		"\n\n【学生代码摘要（精简版）】\n" + truncateRunes(codeSummary, 6000)
}

func truncateRunes(text string, limit int) string {
	if limit <= 0 {
		return ""
	}
	runes := []rune(strings.TrimSpace(text))
	if len(runes) <= limit {
		return string(runes)
	}
	return string(runes[:limit]) + "\n...（已按长度截断）"
}

func normalizeResult(result *Result) {
	for idx := range result.Issues {
		normalizeIssue(&result.Issues[idx])
	}
	for idx := range result.KnowledgePoints {
		normalizeKnowledgePoint(&result.KnowledgePoints[idx])
	}
	if len(result.KnowledgePoints) == 0 {
		result.KnowledgePoints = deriveKnowledgePoints(result.RequirementMatches)
	}
}

func normalizeIssue(issue *Issue) {
	severity := strings.ToLower(strings.TrimSpace(issue.Severity))
	switch severity {
	case "high", "medium", "low":
		issue.Severity = severity
	default:
		issue.Severity = "low"
	}
	category := strings.ToLower(strings.TrimSpace(issue.Category))
	switch category {
	case "requirement", "logic", "quality", "document", "structure", "knowledge", "other":
		issue.Category = category
	default:
		issue.Category = inferIssueCategory(issue.Title + "\n" + issue.Detail)
	}
}

func normalizeKnowledgePoint(point *KnowledgePoint) {
	point.Name = strings.TrimSpace(point.Name)
	point.Evidence = strings.TrimSpace(point.Evidence)
	status := strings.ToLower(strings.TrimSpace(point.Status))
	switch status {
	case "mastered", "partial", "weak":
		point.Status = status
	default:
		point.Status = "partial"
	}
}

func deriveKnowledgePoints(matches []RequirementMatch) []KnowledgePoint {
	points := make([]KnowledgePoint, 0, len(matches))
	for _, item := range matches {
		name := strings.TrimSpace(item.Requirement)
		if name == "" {
			continue
		}
		status := "partial"
		switch strings.ToLower(strings.TrimSpace(item.Status)) {
		case "matched":
			status = "mastered"
		case "missing":
			status = "weak"
		}
		points = append(points, KnowledgePoint{
			Name:     name,
			Status:   status,
			Evidence: strings.TrimSpace(item.Evidence),
		})
	}
	return points
}

func inferIssueCategory(text string) string {
	lower := strings.ToLower(strings.TrimSpace(text))
	switch {
	case strings.Contains(lower, "需求") || strings.Contains(lower, "未实现") || strings.Contains(lower, "缺失"):
		return "requirement"
	case strings.Contains(lower, "逻辑") || strings.Contains(lower, "运行") || strings.Contains(lower, "错误") || strings.Contains(lower, "bug"):
		return "logic"
	case strings.Contains(lower, "文档") || strings.Contains(lower, "说明") || strings.Contains(lower, "注释"):
		return "document"
	case strings.Contains(lower, "结构") || strings.Contains(lower, "目录") || strings.Contains(lower, "模块"):
		return "structure"
	case strings.Contains(lower, "知识点") || strings.Contains(lower, "概念") || strings.Contains(lower, "算法"):
		return "knowledge"
	case strings.Contains(lower, "命名") || strings.Contains(lower, "可读性") || strings.Contains(lower, "规范") || strings.Contains(lower, "重复"):
		return "quality"
	default:
		return "other"
	}
}
