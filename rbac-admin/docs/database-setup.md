# 数据库设置指南

## 快速开始

### 1. 环境要求

- MySQL 5.7+ 或 MySQL 8.0+
- 本地或远程 MySQL 服务器
- 具有数据库创建权限的用户

### 2. 数据库初始化

#### 方法 A：使用初始化脚本（推荐）

```bash
cd rbac-admin/scripts
./init-db.sh
```

或使用自定义连接参数：

```bash
MYSQL_HOST=localhost \
MYSQL_PORT=3306 \
MYSQL_USER=root \
MYSQL_PASSWORD=your_password \
./init-db.sh
```

#### 方法 B：手动初始化

```bash
# 1. 登录 MySQL
mysql -h localhost -P 3306 -u root -p

# 2. 创建数据库
CREATE DATABASE IF NOT EXISTS educational_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 3. 切换到新数据库
USE educational_admin;

# 4. 导入 schema
SOURCE rbac-admin/schema.sql;

# 5. 验证
SHOW TABLES;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'educational_admin';
```

### 3. 配置 MySQL MCP

编辑 `~/.claude/settings.local.json`：

```json
{
  "mcp": {
    "mysql": {
      "command": "mcp-mysql",
      "args": [],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your_password",
        "MYSQL_DATABASE": "educational_admin"
      }
    }
  }
}
```

### 4. 验证连接

```bash
# 验证 MCP 可用性
mcp-mysql --help

# 测试数据库连接
mysql -h localhost -P 3306 -u root -p educational_admin -e "SELECT COUNT(*) as table_count FROM information_schema.tables;"
```

## 数据库设计

### 架构概览

```
educational_admin
├── 部门管理
│   ├── departments (部门表)
│   └── 5层结构: 学校 → 学院 → 阶段 → 专业 → 班级
│
├── 人员管理
│   ├── users (用户表)
│   ├── positions (岗位表)
│   ├── position_categories (岗位类别)
│   └── user_positions (用户-岗位关联)
│
├── 权限管理
│   ├── roles (角色定义)
│   ├── menus (菜单/权限)
│   ├── role_menus (角色-菜单权限)
│   └── user_roles (用户-角色关联)
│
└── 业务数据
    ├── grades (成绩数据)
    └── audit_logs (审计日志)
```

### 核心表详解

#### departments (部门表)

存储组织结构，支持 5 层树形结构：

| 级别 | 说明 | 示例 |
|------|------|------|
| university | 学校 | 巴威职业技术学院 |
| college | 学院 | 全栈开发学院 |
| stage | 阶段 | 专业阶段 / 专业高级阶段 |
| major | 专业 | 专业一 / 专业二 |
| class | 班级 | 2401A / 2310A |

**关键字段：**
- `id` - 部门唯一标识
- `parent_id` - 父部门ID，用于构建树形结构
- `level` - 部门级别
- `code` - 部门代码（唯一）
- `leader_name` - 部门负责人名称
- `staff_count` - 部门人员数量

#### users (用户表)

存储教职工和学生账户：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(50) | 用户ID |
| name | VARCHAR(100) | 用户名称 |
| email | VARCHAR(100) | 邮箱地址 |
| user_type | ENUM | 'staff' 教职工 / 'student' 学生 |
| login_id | VARCHAR(50) | 学号/职工号 |
| department_id | VARCHAR(50) | 所属部门ID |
| access_status | ENUM | 'full' / 'partial' / 'inactive' |
| is_active | BOOLEAN | 账号激活状态 |

#### roles (角色表)

定义系统角色及其权限范围：

| 角色 | DataScope | 权限范围 |
|------|-----------|--------|
| 校长 | school | 全校所有数据 |
| 教务 | school | 全校数据（只读） |
| 专业主任 | major | 所属学院专业级数据 |
| 专高主任 | major | 所属学院高级专业级数据 |
| 讲师 | class | 所在班级数据 |
| 学生 | class | 个人成绩数据 |

## 权限范围 (DataScope)

系统使用四层权限范围控制数据访问：

```
school (学校级)
  ↓ 可见所有学院数据
college (学院级)
  ↓ 可见所属学院数据
major (专业级)
  ↓ 可见所属专业/班级数据
class (班级级)
  ↓ 可见班级内数据
```

## 常用 SQL 查询

### 查看组织结构树

```sql
-- 按层级展示部门树
SELECT
    CONCAT(REPEAT('  ', (SELECT COUNT(*) FROM departments t2 WHERE t2.id IN (
        SELECT parent_id FROM departments t3
        WHERE FIND_IN_SET(t3.id,
            WITH RECURSIVE cte AS (
                SELECT id FROM departments WHERE id = t1.id
                UNION ALL
                SELECT d.id FROM departments d JOIN cte ON d.parent_id = cte.id
            ) SELECT GROUP_CONCAT(id)
        )
    )))) as indent,
    id, name, level, parent_id
FROM departments t1
ORDER BY level, parent_id, id;
```

### 用户统计

```sql
-- 教职工 vs 学生
SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type;

-- 按部门统计
SELECT d.name, COUNT(u.id) as count
FROM users u
JOIN departments d ON u.department_id = d.id
GROUP BY d.name;

-- 按角色统计
SELECT r.name, COUNT(DISTINCT u.id) as count
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN users u ON ur.user_id = u.id
GROUP BY r.name;
```

### 权限查询

```sql
-- 查看某角色的所有权限
SELECT r.name as role_name, m.name as permission_name
FROM role_menus rm
JOIN roles r ON rm.role_id = r.id
JOIN menus m ON rm.menu_id = m.id
WHERE r.name = '专业主任'
ORDER BY m.sort_order;

-- 查看某用户的所有权限
SELECT DISTINCT m.name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_menus rm ON ur.role_id = rm.role_id
JOIN menus m ON rm.menu_id = m.id
WHERE u.id = 'user-fs-pro'
ORDER BY m.sort_order;
```

## 备份和恢复

### 备份数据库

```bash
mysqldump -h localhost -u root -p educational_admin > backup.sql
```

### 恢复数据库

```bash
mysql -h localhost -u root -p educational_admin < backup.sql
```

## 故障排除

### 问题：无法连接到 MySQL

**症状：** `ERROR 2003 (HY000): Can't connect to MySQL server`

**解决方案：**
1. 确保 MySQL 服务正在运行
2. 检查主机名和端口是否正确
3. 验证用户名和密码
4. 检查防火墙设置

### 问题：数据库已存在

**症状：** `ERROR 1007 (HY000): Can't create database 'educational_admin'`

**解决方案：**
```bash
# 删除旧数据库（谨慎！）
mysql -h localhost -u root -p -e "DROP DATABASE educational_admin;"

# 重新初始化
./init-db.sh
```

### 问题：导入 Schema 失败

**症状：** 导入过程中出现语法错误

**解决方案：**
1. 检查 schema.sql 文件是否完整
2. 确保 MySQL 版本兼容
3. 检查字符集设置

```bash
# 使用指定字符集导入
mysql -h localhost -u root -p --default-character-set=utf8mb4 educational_admin < schema.sql
```

## 相关文档

- [MySQL MCP 使用指南](./mysql-mcp-setup.md)
- [数据库 Schema](../schema.sql)
- [API 文档](./user-api.md)

## 更新日志

- **2026-03-26** - 初版：完整的数据库设置和管理指南
