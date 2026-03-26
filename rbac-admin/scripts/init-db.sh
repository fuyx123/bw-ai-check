#!/bin/bash

# MySQL 数据库初始化脚本
# 用于创建数据库并导入 schema.sql

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
MYSQL_HOST=${MYSQL_HOST:-localhost}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
MYSQL_DATABASE="educational_admin"
SCHEMA_FILE="$(dirname "$0")/../schema.sql"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}MySQL 数据库初始化${NC}"
echo -e "${YELLOW}========================================${NC}"
echo "主机: $MYSQL_HOST:$MYSQL_PORT"
echo "用户: $MYSQL_USER"
echo "数据库: $MYSQL_DATABASE"
echo "Schema 文件: $SCHEMA_FILE"

# 检查 schema 文件是否存在
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}✗ 错误：Schema 文件不存在：$SCHEMA_FILE${NC}"
    exit 1
fi

# 构建 MySQL 连接命令
MYSQL_CMD="mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER"
if [ -n "$MYSQL_PASSWORD" ]; then
    MYSQL_CMD="$MYSQL_CMD -p$MYSQL_PASSWORD"
fi

# 测试数据库连接
echo -e "${YELLOW}正在测试数据库连接...${NC}"
if ! $MYSQL_CMD -e "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}✗ 错误：无法连接到 MySQL 服务器${NC}"
    echo -e "${RED}请检查 MySQL 是否正在运行，以及连接参数是否正确${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 数据库连接成功${NC}"

# 创建数据库（如果不存在）
echo -e "${YELLOW}创建数据库...${NC}"
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1
echo -e "${GREEN}✓ 数据库创建/确认成功${NC}"

# 导入 schema
echo -e "${YELLOW}导入 Schema...${NC}"
$MYSQL_CMD $MYSQL_DATABASE < "$SCHEMA_FILE" 2>&1
echo -e "${GREEN}✓ Schema 导入成功${NC}"

# 验证表
echo -e "${YELLOW}验证表结构...${NC}"
TABLE_COUNT=$($MYSQL_CMD $MYSQL_DATABASE -e "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = '$MYSQL_DATABASE';" -N | head -1)
echo -e "${GREEN}✓ 数据库中有 $TABLE_COUNT 张表${NC}"

# 显示所有表
echo -e "${YELLOW}表列表：${NC}"
$MYSQL_CMD $MYSQL_DATABASE -e "SHOW TABLES;" | tail -n +2 | while read table; do
    echo "  - $table"
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 数据库初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"

# 显示验证命令
echo -e "${YELLOW}验证命令（可选）：${NC}"
echo "  1. 查看部门总数"
echo "     mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER $MYSQL_DATABASE -e \"SELECT COUNT(*) as dept_count FROM departments;\""
echo ""
echo "  2. 查看用户总数"
echo "     mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER $MYSQL_DATABASE -e \"SELECT COUNT(*) as user_count FROM users;\""
echo ""
echo "  3. 查看角色列表"
echo "     mysql -h $MYSQL_HOST -P $MYSQL_PORT -u $MYSQL_USER $MYSQL_DATABASE -e \"SELECT id, name, description FROM roles;\""
