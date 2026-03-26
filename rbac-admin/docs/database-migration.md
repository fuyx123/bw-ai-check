# 数据库字段更新日志

## 2026-03-26 更新：users 表字段扩展

### 更新内容

在 `users` 表中添加了两个关键字段，以支持完整的用户管理功能：

#### 1. user_type 字段
```sql
ALTER TABLE users ADD user_type ENUM('staff', 'student')
COMMENT '用户类型：staff-教职工，student-学生';
```

**说明：**
- 类型：`ENUM('staff', 'student')`
- 必填：否（默认为 NULL）
- 用途：区分用户角色（教职工 vs 学生）
- 索引：`idx_user_type` - 用于快速过滤查询

#### 2. login_id 字段
```sql
ALTER TABLE users ADD login_id VARCHAR(50) UNIQUE
COMMENT '学号（学生）或职工号（教职工）';
```

**说明：**
- 类型：`VARCHAR(50)`
- 约束：UNIQUE（唯一性）
- 必填：否
- 用途：学生学号或教职工号，用于登录认证
- 索引：`idx_login_id` - 用于快速查找用户

### 更新前后对比

#### 更新前（12 个字段）
```
1. id                   - 用户ID (主键)
2. name                 - 用户姓名
3. email                - 邮箱地址
4. avatar               - 头像URL
5. initials             - 名称缩写
6. department_id        - 部门ID
7. department_name      - 部门名称
8. access_status        - 访问权限
9. is_active            - 激活状态
10. created_at          - 创建时间
11. updated_at          - 修改时间
12. deleted_at          - 删除时间
```

#### 更新后（14 个字段）
```
1. id                   - 用户ID (主键)
2. name                 - 用户姓名
3. email                - 邮箱地址
4. avatar               - 头像URL
5. initials             - 名称缩写
6. department_id        - 部门ID
7. department_name      - 部门名称
8. access_status        - 访问权限
9. is_active            - 激活状态
10. created_at          - 创建时间
11. updated_at          - 修改时间
12. deleted_at          - 删除时间
13. user_type           - 用户类型 ✨ NEW
14. login_id            - 学号/职工号 ✨ NEW
```

### 数据库约束

| 约束类型 | 字段 | 说明 |
|---------|------|------|
| 主键 | id | 用户唯一标识 |
| 唯一 | email | 邮箱唯一 |
| 唯一 | login_id | 学号/职工号唯一 |
| 外键 | department_id | 关联 departments 表 |

### 性能索引

| 索引名 | 字段 | 用途 |
|--------|------|------|
| idx_department_id | department_id | 按部门查询 |
| idx_email | email | 邮箱查找 |
| idx_access_status | access_status | 权限过滤 |
| idx_user_type | user_type | 用户类型过滤 |
| idx_login_id | login_id | 登录凭证查找 |

### 迁移脚本

如果需要在其他数据库环境执行该更新，可使用以下 SQL：

```sql
-- 添加 user_type 字段
ALTER TABLE users ADD user_type ENUM('staff', 'student')
COMMENT '用户类型：staff-教职工，student-学生';

-- 添加 login_id 字段
ALTER TABLE users ADD login_id VARCHAR(50) UNIQUE
COMMENT '学号（学生）或职工号（教职工）';

-- 创建性能索引
ALTER TABLE users ADD INDEX idx_user_type (user_type);
ALTER TABLE users ADD INDEX idx_login_id (login_id);
```

### 与前端的对应关系

前端 TypeScript 类型 `UserInfo` 中的相关字段：

```typescript
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  userType: UserType;           // 对应 user_type
  loginId: string;              // 对应 login_id
  departmentId: string;
  departmentName: string;
  roleIds: string[];
  roleName: string;
  accessStatus: AccessStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type UserType = 'student' | 'staff';
```

### 后续计划

未来如需支持以下功能，可进一步扩展字段：

- 学生专属：`grade`、`class_id`、`class_name`
- 角色缓存：`role_ids` (JSON)、`role_name`
- 用户统计：`last_login_at`、`login_count`

目前这两个字段足以支持完整的用户管理功能。

---

**更新日期**：2026-03-26
**影响范围**：生产数据库
**状态**：✅ 已完成
