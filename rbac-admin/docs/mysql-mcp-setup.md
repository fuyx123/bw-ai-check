# MySQL MCP 集成指南

## 概述

本项目已集成 `@f4ww4z/mcp-mysql-server` MCP（Model Context Protocol），使 Claude Code 能够直接查询和操作 MySQL 数据库。

## 安装

### 1. 全局安装 MySQL MCP

```bash
npm install -g @f4ww4z/mcp-mysql-server
```

### 2. 配置 Claude Code 设置

在 `~/.claude/settings.local.json` 中添加 MySQL 配置：

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
        "MYSQL_PASSWORD": "",
        "MYSQL_DATABASE": "educational_admin"
      }
    }
  }
}
```

## 配置参数说明

| 参数 | 说明 | 示例值 |
|------|------|--------|
| MYSQL_HOST | MySQL 服务器地址 | localhost |
| MYSQL_PORT | MySQL 服务器端口 | 3306 |
| MYSQL_USER | 数据库用户名 | root |
| MYSQL_PASSWORD | 数据库密码 | （留空表示无密码） |
| MYSQL_DATABASE | 默认数据库名 | educational_admin |

## 使用方式

### 查询数据库

配置完成后，Claude Code 可以直接使用 MySQL 工具：

```
请查询 departments 表中所有学院级别的部门
```

### 常见操作

#### 查看表结构
```sql
DESCRIBE users;
SHOW FIELDS FROM departments;
```

#### 查询数据
```sql
SELECT * FROM users WHERE user_type = 'student';
SELECT COUNT(*) FROM departments WHERE level = 'class';
```

#### 数据统计
```sql
SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type;
SELECT level, COUNT(*) as count FROM departments GROUP BY level;
```

## 数据库表结构

### 核心表（11 张）

1. **departments** - 部门信息表
   - 存储组织结构：学校 → 学院 → 阶段 → 专业 → 班级

2. **roles** - 角色定义表
   - 校长、专业主任、专高主任、教务、讲师等

3. **users** - 用户表
   - 教职工和学生账户

4. **user_roles** - 用户角色关联表
   - 多对多关系

5. **menus** - 菜单/权限表
   - 系统菜单和操作按钮

6. **role_menus** - 角色菜单权限表
   - 角色与菜单的权限映射

7. **positions** - 岗位表
   - 校长、教务主任、讲师等岗位定义

8. **position_categories** - 岗位类别表
   - 管理类、教务类、教学类等

9. **user_positions** - 用户岗位关联表
   - 用户与岗位的绑定

10. **grades** - 成绩表
    - 学生成绩记录

11. **audit_logs** - 审计日志表
    - 系统操作记录

## 权限范围

系统支持四层数据权限范围：

| DataScope | 说明 | 角色示例 |
|-----------|------|--------|
| school | 学校级全权限 | 校长、教务 |
| college | 学院级权限 | 院长 |
| major | 专业级权限 | 专业主任、专高主任 |
| class | 班级级权限 | 讲师 |

## 常见查询示例

### 查看所有教职工
```sql
SELECT id, name, email, department_name, role_name FROM users WHERE user_type = 'staff' LIMIT 10;
```

### 查看学生统计
```sql
SELECT class_name, COUNT(*) as student_count FROM users WHERE user_type = 'student' GROUP BY class_name;
```

### 查看部门树结构
```sql
SELECT id, name, level, parent_id FROM departments ORDER BY level, parent_id, id;
```

### 查看角色权限
```sql
SELECT r.name as role_name, m.name as menu_name FROM role_menus rm
JOIN roles r ON rm.role_id = r.id
JOIN menus m ON rm.menu_id = m.id
WHERE r.name = '专业主任';
```

## 故障排除

### 连接失败

1. 确保 MySQL 服务正在运行
2. 检查主机名、端口、用户名和密码
3. 确保数据库 `educational_admin` 存在

### MCP 命令不可用

1. 重启 Claude Code
2. 检查 settings.local.json 配置是否正确
3. 运行 `mcp-mysql --help` 验证 MCP 安装

### 权限错误

1. 确认数据库用户有正确的权限
2. 使用 `GRANT` 语句赋予必要权限

```sql
GRANT ALL PRIVILEGES ON educational_admin.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

## 相关文档

- [用户管理 API 文档](./user-api.md)
- [数据库 Schema](../schema.sql)

## 更新日志

- **2026-03-26** - 初次集成 MySQL MCP，支持教务管理系统数据库查询
