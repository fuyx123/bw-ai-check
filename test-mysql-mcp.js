#!/usr/bin/env node

// 测试 MySQL MCP 连接的脚本
// 这个脚本演示如何使用 MySQL MCP 来查询数据库

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔌 启动 MySQL MCP 服务器...\n');

const mcp = spawn('npx', ['@f4ww4z/mcp-mysql-server'], {
  env: {
    ...process.env,
    MYSQL_HOST: '115.190.140.148',
    MYSQL_PORT: '3306',
    MYSQL_USER: 'root',
    MYSQL_PASSWORD: '4ay1nkal3u8ed77y',
    MYSQL_DATABASE: 'bw-ai-check'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

let messageId = 1;
const pendingRequests = new Map();

// 处理 MCP 响应
mcp.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('📨 MCP 响应:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('📝 MCP 输出:', line);
    }
  });
});

mcp.stderr.on('data', (data) => {
  console.error('❌ 错误:', data.toString());
});

mcp.on('close', (code) => {
  console.log(`\n✅ MCP 服务器已关闭 (代码: ${code})`);
});

// 等待服务器启动
setTimeout(() => {
  console.log('\n📤 发送初始化请求...\n');

  // 发送 MCP 初始化请求
  const initRequest = {
    jsonrpc: '2.0',
    id: messageId++,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'claude-code-test',
        version: '1.0.0'
      }
    }
  };

  mcp.stdin.write(JSON.stringify(initRequest) + '\n');

  // 列出可用的工具
  setTimeout(() => {
    const listRequest = {
      jsonrpc: '2.0',
      id: messageId++,
      method: 'tools/list',
      params: {}
    };
    mcp.stdin.write(JSON.stringify(listRequest) + '\n');
  }, 1000);

  // 执行查询
  setTimeout(() => {
    const queryRequest = {
      jsonrpc: '2.0',
      id: messageId++,
      method: 'tools/call',
      params: {
        name: 'query',
        arguments: {
          sql: 'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = "bw-ai-check"'
        }
      }
    };
    mcp.stdin.write(JSON.stringify(queryRequest) + '\n');
  }, 2000);

  // 关闭连接
  setTimeout(() => {
    mcp.stdin.end();
  }, 3000);
}, 1000);
