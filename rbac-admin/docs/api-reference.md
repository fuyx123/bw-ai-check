# 八维智能阅卷平台 - API 接口文档

## 目录

1. [概述](#概述)
2. [认证相关](#认证相关)
3. [部门管理](#部门管理)
4. [用户管理](#用户管理)
5. [角色管理](#角色管理)
6. [菜单权限](#菜单权限)
7. [职位管理](#职位管理)
8. [职级管理](#职级管理)
9. [审计日志](#审计日志)
10. [通用规范](#通用规范)

---

## 概述

### 系统架构

本系统采用 **RBAC（基于角色的访问控制）** 权限模型，核心概念：

| 概念 | 说明 | 层级 |
|------|------|------|
| **用户 (User)** | 系统使用者，分为学生和教职工 | - |
| **部门 (Department)** | 组织结构单位 | 学校 → 学院 → 阶段 → 专业 → 班级 |
| **角色 (Role)** | 权限集合，定义用户能做什么 | - |
| **菜单 (Menu)** | 界面导航和操作按钮权限 | - |
| **数据范围 (DataScope)** | 角色能访问的数据级别 | school > college > major > class |
| **职位 (Position)** | 工作职务，独立于角色体系 | - |
| **职级 (Grade)** | 员工等级体系 | - |

### 数据范围权限 (DataScope)

| 范围 | 说明 | 示例角色 |
|------|------|---------|
| `school` | 学校全局数据 | 校长、教务处长 |
| `college` | 学院级数据 | 院长 |
| `major` | 专业级数据 | 专业负责人 |
| `class` | 班级级数据 | 讲师 |

### 用户类型

| 类型 | 说明 | 字段差异 |
|------|------|---------|
| `staff` | 教职工 | 无 grade/class_name/class_id |
| `student` | 学生 | 需要 grade/class_name/class_id |

---

## 认证相关

### 1. 用户登录

**请求**
```
POST /api/auth/login
Content-Type: application/json
```

**请求体**
```json
{
  "username": "admin",
  "password": "123456",
  "userType": "staff"
}
```

**响应**
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "user-005",
      "name": "赵明远",
      "email": "zhao@seuu.edu",
      "role": "校长",
      "dataScope": "school",
      "permissions": ["menu-dashboard", "menu-dept", "menu-role", "menu-user", ...],
      "avatar": null
    },
    "expiresIn": 86400
  }
}
```

**权限要求** 无（公开接口）

---

### 2. 用户登出

**请求**
```
POST /api/auth/logout
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "message": "登出成功"
}
```

---

### 3. 获取当前用户信息

**请求**
```
GET /api/auth/me
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "id": "user-005",
    "name": "赵明远",
    "email": "zhao@seuu.edu",
    "role": "校长",
    "dataScope": "school",
    "permissions": ["menu-dashboard", "menu-dept", ...],
    "avatar": null,
    "loginId": "E001",
    "userType": "staff"
  }
}
```

---

## 部门管理

### 1. 获取部门树形结构

**请求**
```
GET /api/departments/tree
Authorization: Bearer {token}
```

**查询参数** 无

**响应**
```json
{
  "code": 0,
  "data": [
    {
      "id": "dept-root",
      "name": "东南联合大学",
      "code": "SEUU",
      "level": "university",
      "parentId": null,
      "leaderName": "赵明远",
      "leaderTitle": "校长",
      "staffCount": 1284,
      "status": "operational",
      "children": [
        {
          "id": "dept-ie",
          "name": "信息工程学院",
          "code": "IE",
          "level": "college",
          "parentId": "dept-root",
          "leaderName": "刘建国",
          "leaderTitle": "院长",
          "staffCount": 312,
          "status": "operational",
          "children": [...]
        }
      ]
    }
  ]
}
```

**权限要求** `menu-dept` 查看权限

---

### 2. 获取部门列表（分页）

**请求**
```
GET /api/departments
Authorization: Bearer {token}
```

**查询参数**
| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `page` | number | 页码 | 1 |
| `pageSize` | number | 每页数量 | 10 |
| `level` | string | 部门级别 | university/college/major/class |
| `keyword` | string | 搜索关键词 | 信息 |

**响应**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "dept-ie",
        "name": "信息工程学院",
        "code": "IE",
        "level": "college",
        "parentId": "dept-root",
        "leaderName": "刘建国",
        "leaderTitle": "院长",
        "staffCount": 312,
        "status": "operational",
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 10
  }
}
```

**权限要求** `menu-dept` 查看权限

---

### 3. 获取部门详情

**请求**
```
GET /api/departments/{id}
Authorization: Bearer {token}
```

**URL 参数**
- `id`: 部门 ID

**响应**
```json
{
  "code": 0,
  "data": {
    "id": "dept-ie",
    "name": "信息工程学院",
    "code": "IE",
    "level": "college",
    "parentId": "dept-root",
    "leaderName": "刘建国",
    "leaderTitle": "院长",
    "staffCount": 312,
    "status": "operational",
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "users": [
      {
        "id": "user-006",
        "name": "刘建国",
        "email": "liu@seuu.edu",
        "role": "院长"
      }
    ]
  }
}
```

**权限要求** `menu-dept` 查看权限

---

### 4. 创建部门

**请求**
```
POST /api/departments
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "新部门",
  "code": "NEW-DEPT",
  "parentId": "dept-root",
  "level": "college",
  "leaderName": "李明",
  "leaderTitle": "部长",
  "staffCount": 0
}
```

**响应**
```json
{
  "code": 0,
  "message": "部门创建成功",
  "data": {
    "id": "dept-new",
    "name": "新部门",
    "code": "NEW-DEPT",
    "parentId": "dept-root",
    "level": "college",
    "leaderName": "李明",
    "leaderTitle": "部长",
    "staffCount": 0,
    "status": "operational",
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

**权限要求** `menu-dept-add` 创建权限

---

### 5. 编辑部门

**请求**
```
PUT /api/departments/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "更新后的部门名称",
  "leaderName": "新负责人",
  "leaderTitle": "新职务",
  "staffCount": 320
}
```

**响应**
```json
{
  "code": 0,
  "message": "部门更新成功",
  "data": {
    "id": "dept-ie",
    "name": "更新后的部门名称",
    "code": "IE",
    "level": "college",
    "parentId": "dept-root",
    "leaderName": "新负责人",
    "leaderTitle": "新职务",
    "staffCount": 320,
    "status": "operational",
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

**权限要求** `menu-dept-edit` 编辑权限

---

### 6. 删除部门

**请求**
```
DELETE /api/departments/{id}
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "message": "部门删除成功"
}
```

**权限要求** `menu-dept-delete` 删除权限

---

## 用户管理

### 1. 获取用户列表

**请求**
```
GET /api/users
Authorization: Bearer {token}
```

**查询参数**
| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `page` | number | 页码 | 1 |
| `pageSize` | number | 每页数量 | 10 |
| `userType` | string | 用户类型 | staff/student |
| `departmentId` | string | 部门 ID | dept-ie |
| `roleId` | string | 角色 ID | role-dean |
| `keyword` | string | 搜索关键词 | 赵明 |
| `accessStatus` | string | 访问状态 | full/partial/inactive |

**响应**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "user-005",
        "name": "赵明远",
        "email": "zhao@seuu.edu",
        "loginId": "E001",
        "userType": "staff",
        "departmentId": "dept-root",
        "departmentName": "东南联合大学",
        "roleIds": ["role-president"],
        "roleName": "校长",
        "accessStatus": "full",
        "isActive": true,
        "avatar": null,
        "createdAt": "2024-01-05T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "user-student-001",
        "name": "张三",
        "email": "zhangsan@seuu.edu",
        "loginId": "2024010101",
        "userType": "student",
        "departmentId": "dept-cs",
        "departmentName": "计算机科学与技术",
        "roleIds": [],
        "roleName": null,
        "grade": "2024级",
        "className": "2401A",
        "classId": "class-2401a",
        "accessStatus": "full",
        "isActive": true,
        "avatar": null,
        "createdAt": "2024-01-10T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 10,
    "totalActive": 145,
    "totalStaff": 120,
    "totalStudent": 30
  }
}
```

**权限要求** `menu-user` 查看权限（受 DataScope 限制）

---

### 2. 获取用户详情

**请求**
```
GET /api/users/{id}
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "id": "user-005",
    "name": "赵明远",
    "email": "zhao@seuu.edu",
    "avatar": null,
    "loginId": "E001",
    "userType": "staff",
    "departmentId": "dept-root",
    "departmentName": "东南联合大学",
    "roleIds": ["role-president"],
    "roleName": "校长",
    "accessStatus": "full",
    "isActive": true,
    "positionIds": ["pos-006"],
    "createdAt": "2024-01-05T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**权限要求** `menu-user` 查看权限

---

### 3. 创建用户

**请求**
```
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体 - 教职工**
```json
{
  "name": "新员工",
  "email": "newstaff@seuu.edu",
  "loginId": "E999",
  "userType": "staff",
  "departmentId": "dept-ie",
  "roleIds": ["role-lecturer"],
  "accessStatus": "full",
  "isActive": true,
  "avatar": null
}
```

**请求体 - 学生**
```json
{
  "name": "学生张三",
  "email": "student@seuu.edu",
  "loginId": "2024010102",
  "userType": "student",
  "departmentId": "dept-cs",
  "grade": "2024级",
  "className": "2402A",
  "classId": "class-2402a",
  "accessStatus": "full",
  "isActive": true,
  "avatar": null
}
```

**响应**
```json
{
  "code": 0,
  "message": "用户创建成功",
  "data": {
    "id": "user-new",
    "name": "新员工",
    "email": "newstaff@seuu.edu",
    "loginId": "E999",
    "userType": "staff",
    "departmentId": "dept-ie",
    "departmentName": "信息工程学院",
    "roleIds": ["role-lecturer"],
    "roleName": "讲师",
    "accessStatus": "full",
    "isActive": true,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

**权限要求** `menu-user-add` 创建权限

---

### 4. 编辑用户

**请求**
```
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "更新后的名称",
  "departmentId": "dept-cs",
  "roleIds": ["role-major-lead"],
  "accessStatus": "partial",
  "isActive": true
}
```

**响应**
```json
{
  "code": 0,
  "message": "用户更新成功",
  "data": {
    "id": "user-005",
    "name": "更新后的名称",
    "email": "zhao@seuu.edu",
    "departmentId": "dept-cs",
    "departmentName": "计算机科学与技术",
    "roleIds": ["role-major-lead"],
    "roleName": "专业负责人",
    "accessStatus": "partial",
    "isActive": true,
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

**权限要求** `menu-user-edit` 编辑权限

---

### 5. 删除用户

**请求**
```
DELETE /api/users/{id}
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "message": "用户删除成功"
}
```

**权限要求** `menu-user-delete` 删除权限

---

### 6. 切换用户激活状态

**请求**
```
PATCH /api/users/{id}/status
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "isActive": false,
  "reason": "离职处理"
}
```

**响应**
```json
{
  "code": 0,
  "message": "用户状态已更新",
  "data": {
    "id": "user-005",
    "name": "赵明远",
    "isActive": false,
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

---

## 角色管理

### 1. 获取角色列表

**请求**
```
GET /api/roles
Authorization: Bearer {token}
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |
| `keyword` | string | 搜索关键词 |

**响应**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "role-president",
        "name": "校长",
        "description": "学校最高行政负责人，拥有全部权限",
        "dataScope": "school",
        "userCount": 1,
        "menuCount": 24,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "role-dean",
        "name": "院长",
        "description": "学院负责人，管理学院事务",
        "dataScope": "college",
        "userCount": 8,
        "menuCount": 8,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 6,
    "page": 1,
    "pageSize": 10
  }
}
```

**权限要求** `menu-role` 查看权限

---

### 2. 获取角色详情及权限

**请求**
```
GET /api/roles/{id}/menus
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "role": {
      "id": "role-president",
      "name": "校长",
      "description": "学校最高行政负责人，拥有全部权限",
      "dataScope": "school",
      "userCount": 1
    },
    "menus": [
      {
        "id": "menu-dashboard",
        "name": "工作台",
        "path": "/dashboard",
        "icon": "DashboardOutlined",
        "type": "menu",
        "sortOrder": 1,
        "visible": true,
        "children": []
      },
      {
        "id": "menu-dept",
        "name": "部门管理",
        "path": "/departments",
        "icon": "ApartmentOutlined",
        "type": "menu",
        "sortOrder": 2,
        "visible": true,
        "children": [
          {
            "id": "menu-dept-add",
            "name": "新增部门",
            "type": "button",
            "sortOrder": 1
          },
          {
            "id": "menu-dept-edit",
            "name": "编辑部门",
            "type": "button",
            "sortOrder": 2
          },
          {
            "id": "menu-dept-delete",
            "name": "删除部门",
            "type": "button",
            "sortOrder": 3
          }
        ]
      }
    ]
  }
}
```

**权限要求** `menu-role` 查看权限

---

### 3. 创建角色

**请求**
```
POST /api/roles
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "新角色",
  "description": "新角色描述",
  "dataScope": "college",
  "menuIds": ["menu-dashboard", "menu-dept", "menu-user"]
}
```

**响应**
```json
{
  "code": 0,
  "message": "角色创建成功",
  "data": {
    "id": "role-new",
    "name": "新角色",
    "description": "新角色描述",
    "dataScope": "college",
    "userCount": 0,
    "menuCount": 3,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

**权限要求** `menu-role-add` 创建权限

---

### 4. 编辑角色权限

**请求**
```
PUT /api/roles/{id}/menus
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "menuIds": ["menu-dashboard", "menu-dept", "menu-dept-add", "menu-dept-edit", "menu-user"]
}
```

**响应**
```json
{
  "code": 0,
  "message": "角色权限更新成功",
  "data": {
    "id": "role-dean",
    "name": "院长",
    "menuCount": 5,
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

**权限要求** `menu-role-assign` 权限分配权限

---

### 5. 删除角色

**请求**
```
DELETE /api/roles/{id}
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "message": "角色删除成功"
}
```

**权限要求** `menu-role-delete` 删除权限

---

## 菜单权限

### 1. 获取所有菜单树

**请求**
```
GET /api/menus/tree
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "data": [
    {
      "id": "menu-dashboard",
      "name": "工作台",
      "path": "/dashboard",
      "icon": "DashboardOutlined",
      "type": "menu",
      "sortOrder": 1,
      "visible": true,
      "children": []
    },
    {
      "id": "menu-dept",
      "name": "部门管理",
      "path": "/departments",
      "icon": "ApartmentOutlined",
      "type": "menu",
      "sortOrder": 2,
      "visible": true,
      "children": [
        {
          "id": "menu-dept-add",
          "name": "新增部门",
          "type": "button",
          "sortOrder": 1
        },
        {
          "id": "menu-dept-edit",
          "name": "编辑部门",
          "type": "button",
          "sortOrder": 2
        }
      ]
    }
  ]
}
```

**权限要求** 无（基于用户权限过滤返回）

---

### 2. 获取用户菜单权限

**请求**
```
GET /api/menus/user-menus
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "menus": [
      {
        "id": "menu-dashboard",
        "name": "工作台",
        "path": "/dashboard",
        "icon": "DashboardOutlined",
        "type": "menu",
        "sortOrder": 1
      },
      {
        "id": "menu-dept",
        "name": "部门管理",
        "path": "/departments",
        "icon": "ApartmentOutlined",
        "type": "menu",
        "sortOrder": 2
      }
    ],
    "permissions": ["menu-dashboard", "menu-dept", "menu-dept-add", "menu-dept-edit", "menu-dept-export", ...]
  }
}
```

**权限要求** 已认证用户

---

### 3. 创建菜单

**请求**
```
POST /api/menus
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "新菜单",
  "path": "/new-menu",
  "icon": "MenuOutlined",
  "parentId": null,
  "type": "menu",
  "sortOrder": 8,
  "visible": true
}
```

**响应**
```json
{
  "code": 0,
  "message": "菜单创建成功",
  "data": {
    "id": "menu-new",
    "name": "新菜单",
    "path": "/new-menu",
    "icon": "MenuOutlined",
    "parentId": null,
    "type": "menu",
    "sortOrder": 8,
    "visible": true,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

**权限要求** `menu-menu-add` 创建权限

---

### 4. 编辑菜单

**请求**
```
PUT /api/menus/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "更新的菜单名称",
  "sortOrder": 3,
  "visible": true
}
```

**响应**
```json
{
  "code": 0,
  "message": "菜单更新成功",
  "data": {
    "id": "menu-new",
    "name": "更新的菜单名称",
    "path": "/new-menu",
    "sortOrder": 3,
    "visible": true,
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

**权限要求** `menu-menu-edit` 编辑权限

---

### 5. 删除菜单

**请求**
```
DELETE /api/menus/{id}
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "message": "菜单删除成功"
}
```

**权限要求** `menu-menu-delete` 删除权限

---

## 职位管理

### 1. 获取职位分类列表

**请求**
```
GET /api/position-categories
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "data": [
    {
      "code": "teaching",
      "name": "教学岗位",
      "color": "#FF6B6B",
      "icon": "BookOutlined",
      "sortOrder": 1,
      "description": "负责教学工作的岗位"
    },
    {
      "code": "research",
      "name": "科研岗位",
      "color": "#4ECDC4",
      "icon": "ExperimentOutlined",
      "sortOrder": 2,
      "description": "负责科研工作的岗位"
    }
  ]
}
```

---

### 2. 获取职位列表

**请求**
```
GET /api/positions
Authorization: Bearer {token}
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |
| `categoryCode` | string | 分类代码 |
| `keyword` | string | 搜索关键词 |

**响应**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "pos-001",
        "name": "教授",
        "code": "PROF",
        "categoryCode": "teaching",
        "categoryName": "教学岗位",
        "level": 4,
        "description": "大学教授职位",
        "headcount": 45,
        "occupiedCount": 38,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

---

### 3. 创建职位

**请求**
```
POST /api/positions
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "副研究员",
  "code": "ASSOC-RESEARCHER",
  "categoryCode": "research",
  "level": 2,
  "description": "副研究员职位",
  "headcount": 20
}
```

**响应**
```json
{
  "code": 0,
  "message": "职位创建成功",
  "data": {
    "id": "pos-new",
    "name": "副研究员",
    "code": "ASSOC-RESEARCHER",
    "categoryCode": "research",
    "categoryName": "科研岗位",
    "level": 2,
    "description": "副研究员职位",
    "headcount": 20,
    "occupiedCount": 0,
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

**权限要求** `menu-pos-add` 创建权限

---

### 4. 编辑职位

**请求**
```
PUT /api/positions/{id}
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "name": "高级讲师",
  "headcount": 25
}
```

**响应**
```json
{
  "code": 0,
  "message": "职位更新成功",
  "data": {
    "id": "pos-003",
    "name": "高级讲师",
    "headcount": 25,
    "updatedAt": "2024-01-20T11:00:00Z"
  }
}
```

**权限要求** `menu-pos-edit` 编辑权限

---

### 5. 删除职位

**请求**
```
DELETE /api/positions/{id}
Authorization: Bearer {token}
```

**响应**
```json
{
  "code": 0,
  "message": "职位删除成功"
}
```

**权限要求** `menu-pos-delete` 删除权限

---

## 职级管理

### 1. 获取职级列表

**请求**
```
GET /api/grades
Authorization: Bearer {token}
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |

**响应**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "grade-001",
        "code": "G1",
        "name": "一级",
        "level": 1,
        "description": "最低等级",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "grade-002",
        "code": "G2",
        "name": "二级",
        "level": 2,
        "description": "初级等级",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 6,
    "page": 1,
    "pageSize": 10
  }
}
```

**权限要求** `menu-grade` 查看权限

---

### 2. 创建职级

**请求**
```
POST /api/grades
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**
```json
{
  "code": "G7",
  "name": "七级",
  "level": 7,
  "description": "更高等级"
}
```

**响应**
```json
{
  "code": 0,
  "message": "职级创建成功",
  "data": {
    "id": "grade-007",
    "code": "G7",
    "name": "七级",
    "level": 7,
    "description": "更高等级",
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

**权限要求** 管理员权限

---

## 审计日志

### 1. 获取审计日志列表

**请求**
```
GET /api/audit-logs
Authorization: Bearer {token}
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码 |
| `pageSize` | number | 每页数量 |
| `action` | string | 操作类型 |
| `operator` | string | 操作人 |
| `type` | string | 日志类型（info/warning/success） |
| `startDate` | string | 开始日期（ISO 8601） |
| `endDate` | string | 结束日期（ISO 8601） |

**响应**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": "audit-001",
        "action": "创建用户",
        "operator": "赵明远",
        "target": "user-new",
        "type": "success",
        "createdAt": "2024-01-20T10:15:30Z"
      },
      {
        "id": "audit-002",
        "action": "修改角色权限",
        "operator": "赵明远",
        "target": "role-dean",
        "type": "success",
        "createdAt": "2024-01-20T10:00:00Z"
      },
      {
        "id": "audit-003",
        "action": "删除部门",
        "operator": "系统",
        "target": "dept-test",
        "type": "warning",
        "createdAt": "2024-01-19T14:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

**权限要求** 已认证用户（仅查看自己的操作或管理员权限）

---

## 通用规范

### 状态码

| 代码 | 说明 |
|------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 无权限 |
| 1003 | 资源不存在 |
| 1004 | 资源已存在 |
| 1005 | 操作失败 |
| 1006 | 业务规则冲突 |
| 2001 | 认证失败 |
| 2002 | Token 过期 |
| 2003 | Token 无效 |

### 错误响应

```json
{
  "code": 1002,
  "message": "无权限访问此资源",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### 分页参数

所有分页接口均支持以下参数：
- `page` (默认: 1) - 页码，从 1 开始
- `pageSize` (默认: 10) - 每页记录数，最大 100

### 认证方式

所有需要认证的接口都需要在请求头中提供 Bearer Token：

```
Authorization: Bearer <token>
```

### 数据范围权限 (DataScope)

根据用户的 DataScope，自动过滤返回的数据：

- `school`: 返回全校所有数据
- `college`: 只返回所属学院及以下的数据
- `major`: 只返回所属专业及以下的数据
- `class`: 只返回所属班级的数据

### 时间格式

所有时间字段均采用 ISO 8601 格式：`YYYY-MM-DDTHH:mm:ssZ`

### 排序规则

- 部门：按 `level` → `sortOrder` → `createdAt`
- 菜单：按 `sortOrder` → `createdAt`
- 用户：按 `createdAt` 倒序
- 角色：按 `createdAt` 倒序

---

**文档版本** 1.0
**最后更新** 2024-01-20
**适用版本** 1.0.0+

