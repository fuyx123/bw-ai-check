const { ChildProcessTransport } = require('@modelcontextprotocol/sdk/client/stdio');
const { Client } = require('@modelcontextprotocol/sdk/client/client');
const { spawn } = require('child_process');

async function queryTables() {
  console.log('🔌 通过 MCP 连接到 MySQL 服务器...\n');

  const mcpProcess = spawn('npx', ['--yes', '@f4ww4z/mcp-mysql-server'], {
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

  const transport = new ChildProcessTransport(mcpProcess, 'utf-8');
  const client = new Client({
    name: 'claude-code-query',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ MCP 连接成功！\n');

    // 列出可用的工具
    const tools = await client.listTools();
    console.log('📋 可用工具列表：');
    tools.tools.forEach((tool, idx) => {
      console.log(`  ${idx + 1}. ${tool.name} - ${tool.description}`);
    });
    console.log();

    // 查询表数量
    console.log('📤 执行查询：统计数据库中的表数...\n');
    
    const result = await client.callTool({
      name: 'query',
      arguments: {
        sql: 'SELECT COUNT(*) as table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = "bw-ai-check"'
      }
    });

    console.log('📊 查询结果：');
    console.log(JSON.stringify(result, null, 2));
    
    // 详细列出所有表
    console.log('\n📤 获取所有表的列表...\n');
    
    const tablesResult = await client.callTool({
      name: 'query',
      arguments: {
        sql: 'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = "bw-ai-check" ORDER BY TABLE_NAME'
      }
    });

    console.log('📝 数据库表列表：');
    console.log(JSON.stringify(tablesResult, null, 2));

  } catch (error) {
    console.error('❌ 错误：', error.message);
  } finally {
    await client.close();
    mcpProcess.kill();
  }
}

queryTables().catch(console.error);
