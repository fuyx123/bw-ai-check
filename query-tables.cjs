const { spawn } = require('child_process');

const mcp = spawn('npx', ['--yes', '@f4ww4z/mcp-mysql-server'], {
  env: {
    ...process.env,
    MYSQL_HOST: '115.190.140.148',
    MYSQL_PORT: '3306',
    MYSQL_USER: 'root',
    MYSQL_PASSWORD: '4ay1nkal3u8ed77y',
    MYSQL_DATABASE: 'bw-ai-check'
  }
});

let output = '';
let closed = false;

mcp.stdout.on('data', (data) => {
  output += data.toString();
});

mcp.stderr.on('data', (data) => {
  console.error('MCP Error:', data.toString());
});

mcp.on('close', () => {
  closed = true;
});

// 发送查询请求
setTimeout(() => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'query',
      arguments: {
        sql: 'SELECT COUNT(*) as table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = "bw-ai-check"'
      }
    }
  };
  
  mcp.stdin.write(JSON.stringify(request) + '\n');
  
  // 3秒后关闭
  setTimeout(() => {
    mcp.stdin.end();
  }, 3000);
}, 500);
