const mysql = require('mysql2/promise');

async function queryTables() {
  let connection;
  try {
    console.log('🔗 通过 MySQL 直接连接查询数据库...\n');
    
    connection = await mysql.createConnection({
      host: '115.190.140.148',
      user: 'root',
      password: '4ay1nkal3u8ed77y',
      database: 'bw-ai-check'
    });

    // 查询表总数
    const [countResult] = await connection.execute(
      `SELECT COUNT(*) as table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'bw-ai-check'`
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 数据库表统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`总表数：${countResult[0].table_count} 张\n`);

    // 列出所有表
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'bw-ai-check' ORDER BY TABLE_NAME`
    );

    console.log('📋 表名列表：\n');
    tables.forEach((row, idx) => {
      console.log(`${String(idx + 1).padStart(2)}. ${row.TABLE_NAME}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ 连接失败：', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

queryTables();
