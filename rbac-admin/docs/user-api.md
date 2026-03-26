# 用户管理 API 文档

**版本**：1.0.0
**最后更新**：2026-03-26
**状态**：草稿（接口设计）

---

## 目录

1. [概述](#概述)
2. [数据模型](#数据模型)
3. [接口定义](#接口定义)
4. [错误处理](#错误处理)
5. [示例](#示例)

---

## 概述

用户管理 API 用于管理系统中的用户信息，支持学生和教职工两种用户类型。API 基于 RESTful 设计，所有请求/响应均使用 JSON 格式。

### 核心特性

- **双类型用户支持**：学生（student）和教职工（staff）
- **灵活的筛选和搜索**：支持多维度组合筛选
- **RBAC 权限模型**：用户与角色多对多关联
- **分页支持**：大数据集分页查询

---

## 数据模型

### User（用户）

用户对象包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 用户唯一标识（如 `user-001`） |
| `name` | string | 是 | 用户姓名（如 `赵明远`） |
| `email` | string | 是 | 用户邮箱（唯一，如 `zhao@seuu.edu`） |
| `avatar` | string | 否 | 头像 URL |
| `initials` | string | 否 | 姓名缩写，用于头像占位（如 `ZMY`） |
| `userType` | string | 是 | 用户类型：`student`（学生）或 `staff`（教职工） |
| `loginId` | string | 是 | 登录凭证（学号或职工号，唯一）|
| `departmentId` | string | 是 | 所属部门 ID（如 `dept-root`） |
| `departmentName` | string | 是 | 所属部门名称（如 `东南联合大学`） |
| `roleIds` | array | 是 | 关联角色 ID 数组（教职工可有多个角色，学生为空数组） |
| `roleName` | string | 是 | 角色名称，展示用（如 `校长`、`讲师`、`学生`） |
| `accessStatus` | string | 是 | 访问权限状态：`full`（完全权限）、`partial`（部分权限）、`inactive`（无权限） |
| `isActive` | boolean | 是 | 账号激活状态：`true`（激活）、`false`（禁用） |
| `grade` | string | 否 | 年级（仅学生，如 `2024级`） |
| `className` | string | 否 | 班级名称（仅学生，如 `计科2301`） |
| `classId` | string | 否 | 班级 ID（仅学生） |
| `createdAt` | string(ISO 8601) | 是 | 创建时间（如 `2024-01-15T10:30:00Z`） |
| `updatedAt` | string(ISO 8601) | 是 | 更新时间（如 `2024-01-20T14:45:00Z`） |

### UserType（用户类型）

```typescript
type UserType = 'student' | 'staff';
```

- `student`：学生用户，拥有 `grade`、`className`、`classId` 字段
- `staff`：教职工用户，无学生专属字段

### AccessStatus（访问权限状态）

```typescript
type AccessStatus = 'full' | 'partial' | 'inactive';
```

- `full`：完全权限，可访问所有授权菜单
- `partial`：部分权限，仅可访问特定菜单
- `inactive`：无权限，账号被禁用

---

## 接口定义

### 1. 查询用户列表

获取分页的用户列表，支持多维度筛选和关键词搜索。

```
GET /api/users
```

#### 请求参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 当前页码 |
| `pageSize` | number | 10 | 每页条数 |
| `userType` | string | 无 | 筛选用户类型：`student` 或 `staff` |
| `departmentId` | string | 无 | 筛选部门 ID |
| `roleId` | string | 无 | 筛选角色 ID（用户关联的任一角色匹配即可） |
| `keyword` | string | 无 | 关键词搜索（匹配 name、email、loginId，模糊匹配） |

#### 响应示例（200 OK）

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 1284,
    "page": 1,
    "pageSize": 10,
    "items": [
      {
        "id": "user-005",
        "name": "赵明远",
        "email": "zhao@seuu.edu",
        "avatar": null,
        "initials": "ZMY",
        "userType": "staff",
        "loginId": "E001",
        "departmentId": "dept-root",
        "departmentName": "东南联合大学",
        "roleIds": ["role-president"],
        "roleName": "校长",
        "accessStatus": "full",
        "isActive": true,
        "grade": null,
        "className": null,
        "classId": null,
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-20T14:45:00Z"
      },
      {
        "id": "stu-fs-pro1-001",
        "name": "林小雨",
        "email": "lin.xiaoyu@seuu.edu",
        "avatar": null,
        "initials": "LX",
        "userType": "student",
        "loginId": "2024010101",
        "departmentId": "dept-fs-pro-1",
        "departmentName": "全栈开发学院 · 专业一",
        "roleIds": [],
        "roleName": "学生",
        "accessStatus": "full",
        "isActive": true,
        "grade": "2024级",
        "className": "专业一",
        "classId": "dept-fs-pro-1",
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-22T16:30:00Z"
      }
    ]
  }
}
```

---

### 2. 查询用户详情

获取单个用户的完整信息。

```
GET /api/users/:id
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 用户 ID |

#### 响应示例（200 OK）

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "user-005",
    "name": "赵明远",
    "email": "zhao@seuu.edu",
    "avatar": null,
    "initials": "ZMY",
    "userType": "staff",
    "loginId": "E001",
    "departmentId": "dept-root",
    "departmentName": "东南联合大学",
    "roleIds": ["role-president"],
    "roleName": "校长",
    "accessStatus": "full",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}
```

#### 错误响应

```json
{
  "code": 404,
  "message": "User not found"
}
```

---

### 3. 新增用户

创建新的用户账户。

```
POST /api/users
```

#### 请求体（教职工）

```json
{
  "name": "王建国",
  "email": "wang.jianguo@seuu.edu",
  "initials": "WJ",
  "userType": "staff",
  "loginId": "E002",
  "departmentId": "dept-ie",
  "roleIds": ["role-dean"],
  "accessStatus": "full",
  "isActive": true
}
```

#### 请求体（学生）

```json
{
  "name": "林小雨",
  "email": "lin.xiaoyu@seuu.edu",
  "initials": "LX",
  "userType": "student",
  "loginId": "2024010101",
  "departmentId": "dept-fs-pro-1",
  "grade": "2024级",
  "className": "专业一",
  "classId": "dept-fs-pro-1",
  "accessStatus": "full",
  "isActive": true
}
```

#### 响应示例（201 Created）

```json
{
  "code": 201,
  "message": "User created successfully",
  "data": {
    "id": "user-011",
    "name": "王建国",
    "email": "wang.jianguo@seuu.edu",
    "userType": "staff",
    "loginId": "E002",
    "departmentId": "dept-ie",
    "departmentName": "信息工程学院",
    "roleIds": ["role-dean"],
    "roleName": "院长",
    "accessStatus": "full",
    "isActive": true,
    "createdAt": "2024-03-26T10:00:00Z",
    "updatedAt": "2024-03-26T10:00:00Z"
  }
}
```

#### 验证规则

- `name`：非空，长度 1-100
- `email`：有效的邮箱格式，全局唯一
- `loginId`：非空，全局唯一（学号或职工号）
- `userType`：必须是 `student` 或 `staff`
- `departmentId`：必须是存在的部门 ID
- 学生必须提供 `grade`、`className`、`classId`
- 教职工可选 `roleIds`

---

### 4. 更新用户信息

更新用户的基本信息。

```
PUT /api/users/:id
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 用户 ID |

#### 请求体

```json
{
  "name": "王建国（已更新）",
  "email": "wang.jianguo.new@seuu.edu",
  "departmentId": "dept-ie",
  "roleIds": ["role-dean", "role-lecturer"],
  "accessStatus": "partial"
}
```

#### 响应示例（200 OK）

```json
{
  "code": 200,
  "message": "User updated successfully",
  "data": {
    "id": "user-011",
    "name": "王建国（已更新）",
    "email": "wang.jianguo.new@seuu.edu",
    "userType": "staff",
    "loginId": "E002",
    "departmentId": "dept-ie",
    "departmentName": "信息工程学院",
    "roleIds": ["role-dean", "role-lecturer"],
    "roleName": "院长",
    "accessStatus": "partial",
    "isActive": true,
    "updatedAt": "2024-03-26T11:30:00Z"
  }
}
```

#### 约束

- 不可修改 `userType` 和 `loginId`（账号属性固定）
- 学生可更新 `grade`、`className`、`classId`
- 教职工可更新 `roleIds`

---

### 5. 更新用户访问状态

单独更新用户的访问权限状态或激活状态。

```
PATCH /api/users/:id/status
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 用户 ID |

#### 请求体

```json
{
  "accessStatus": "inactive",
  "isActive": false
}
```

#### 响应示例（200 OK）

```json
{
  "code": 200,
  "message": "User status updated successfully",
  "data": {
    "id": "user-011",
    "accessStatus": "inactive",
    "isActive": false,
    "updatedAt": "2024-03-26T12:00:00Z"
  }
}
```

---

### 6. 删除用户

删除指定用户。

```
DELETE /api/users/:id
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 用户 ID |

#### 响应示例（204 No Content）

```
HTTP/1.1 204 No Content
```

#### 错误响应

```json
{
  "code": 400,
  "message": "Cannot delete user with active sessions"
}
```

---

## 错误处理

### 通用错误响应格式

```json
{
  "code": 400,
  "message": "Error message",
  "details": {
    "field": "email",
    "reason": "Email already exists"
  }
}
```

### 常见错误码

| 错误码 | 说明 | 原因 |
|--------|------|------|
| 400 | Bad Request | 请求参数错误或验证失败 |
| 404 | Not Found | 用户不存在 |
| 409 | Conflict | 邮箱或登录凭证重复 |
| 422 | Unprocessable Entity | 业务逻辑验证失败 |
| 500 | Internal Server Error | 服务器内部错误 |

### 验证失败示例

```json
{
  "code": 400,
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "loginId",
      "message": "Login ID already exists"
    }
  ]
}
```

---

## 示例

### 示例 1：查询学生用户列表

```bash
curl -X GET "http://localhost:3000/api/users?userType=student&page=1&pageSize=20"
```

### 示例 2：按部门和角色筛选教职工

```bash
curl -X GET "http://localhost:3000/api/users?userType=staff&departmentId=dept-ie&roleId=role-dean"
```

### 示例 3：关键词搜索

```bash
curl -X GET "http://localhost:3000/api/users?keyword=zhao"
```

### 示例 4：创建学生用户

```bash
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "林小雨",
    "email": "lin.xiaoyu@seuu.edu",
    "initials": "LX",
    "userType": "student",
    "loginId": "2024010101",
    "departmentId": "dept-fs-pro-1",
    "grade": "2024级",
    "className": "专业一",
    "classId": "dept-fs-pro-1",
    "accessStatus": "full",
    "isActive": true
  }'
```

### 示例 5：批量禁用用户

```bash
# 先查询，再逐个更新
curl -X PATCH "http://localhost:3000/api/users/user-004/status" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

---

## 附录

### 用户类型对比

| 字段 | 教职工 | 学生 |
|------|--------|------|
| `userType` | `staff` | `student` |
| `loginId` | 职工号（如 E001） | 学号（如 2024010101） |
| `roleIds` | 可为多个角色 | 空数组 `[]` |
| `grade` | 不存在 | 有值（如 2024级） |
| `className` | 不存在 | 有值（如 计科2301） |
| `classId` | 不存在 | 有值 |

### 常用的查询组合

| 场景 | 查询参数 |
|------|---------|
| 查看所有讲师 | `userType=staff&roleId=role-lecturer` |
| 查看学院下的所有学生 | `userType=student&departmentId=dept-ie` |
| 查看禁用的用户 | 需添加 `isActive=false` 参数支持 |
| 按创建时间排序 | 需后端支持 `sortBy=createdAt&order=desc` |
