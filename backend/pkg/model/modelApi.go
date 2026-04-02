package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Input struct {
	Messages []Message `json:"messages"`
}

type Parameters struct {
	ResultFormat string `json:"result_format"`
}

type RequestBody struct {
	Model      string     `json:"model"`
	Input      Input      `json:"input"`
	Parameters Parameters `json:"parameters"`
}

func main() {
	// 创建 HTTP 客户端
	client := &http.Client{}

	// 构建请求体
	requestBody := RequestBody{
		// 此处以qwen-plus为例，可按需更换模型名称。模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
		Model: "qwen3.5-plus",
		Input: Input{
			Messages: []Message{
				{
					Role:    "system",
					Content: "You are a helpful assistant.",
				},
				{
					Role:    "user",
					Content: "你是谁？",
				},
			},
		},
		Parameters: Parameters{
			ResultFormat: "message",
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		log.Fatal(err)
	}

	// 创建 POST 请求
	req, err := http.NewRequest("POST", "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatal(err)
	}

	// 设置请求头
	// 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey := "sk-xxx"
	apiKey := "sk-3815bd41d65b42e5a7482bbf4aaf6fd4"
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		log.Fatal(err)
	}
	defer resp.Body.Close()

	// 读取响应体
	bodyText, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal(err)
	}

	// 打印响应内容
	fmt.Printf("%s\n", bodyText)
}
