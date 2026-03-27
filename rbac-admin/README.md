# 八维智能阅卷平台 - RBAC 权限管理系统

基于 React 19 + TypeScript + Ant Design 6 + Zustand 构建的八维智能阅卷平台，实现了完整的 RBAC（基于角色的访问控制）权限模型。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.x | 前端框架 |
| TypeScript | 5.9 | 类型安全 |
| Vite | 8.x | 构建工具 |
| Ant Design | 6.x | UI 组件库 |
| Zustand | 5.x | 状态管理 |
| React Router | 7.x | 路由管理 |
| xlsx | 0.18 | Excel 导出 |

## 功能模块

- **登录认证** — 模拟账号登录，路由守卫保护，支持多角色切换
- **工作台** — 系统概览仪表盘（部门/用户/角色/岗位统计）
- **部门管理** — 树形组织架构的增删改查
- **角色管理** — 角色定义、权限分配、数据范围控制
- **用户管理** — 用户信息维护、角色分配、状态管理
- **岗位管理** — 岗位分类与层级管理
- **职级管理** — 教职工职级体系管理
- **菜单管理** — 动态菜单配置与权限绑定

## 权限模型

系统采用 RBAC 模型，核心概念：

- **DataScope（数据范围）**：`school` → `college` → `major` → `class`，逐级收窄
- **权限粒度**：菜单级 + 按钮级，通过菜单 ID 数组控制
- **角色层级**：校长（全局）、院长（学院级）、讲师（基础权限）等

## 快速启动

### 环境要求

- Node.js >= 18
- npm >= 9（或 pnpm / yarn）

### 安装依赖

```bash
cd rbac-admin
npm install
```

### 开发模式

```bash
npm run dev
```

启动后访问 http://localhost:5173

### 后端 API

项目已补充企业化分层后端，默认使用当前前端基线数据作为种子，便于先完成接口联调：

```bash
npm run server:build
npm run server:start
```

默认监听 `http://localhost:3000`。

本地联调建议：

1. 终端一运行 `npm run server:dev`
2. 终端二运行 `npm run dev`
3. 前端开发服务器会把 `/api/*` 自动代理到 `http://localhost:3000`

可用环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_PORT` | `3000` | API 端口 |
| `API_HOST` | `0.0.0.0` | API 监听地址 |
| `API_ALLOWED_ORIGINS` | `http://localhost:5173` | 允许跨域来源，多个值用逗号分隔 |
| `API_TOKEN_SECRET` | `bw-ai-check-dev-secret` | 访问令牌签名密钥 |
| `API_TOKEN_TTL_SECONDS` | `43200` | 令牌有效期（秒） |

后端目录结构：

```text
server/
├── src/
│   ├── config/        # 运行配置
│   ├── core/          # 应用装配 / 启动入口
│   ├── data/          # 种子数据与内存存储
│   ├── modules/       # 路由注册
│   ├── services/      # 业务服务层
│   └── shared/        # 鉴权 / 校验 / 路由 / HTTP 通用能力
└── package.json       # CommonJS 运行配置
```

当前后端已覆盖认证、部门、用户、角色、菜单、岗位/岗位分类、职级、审计日志接口。

### 构建生产版本

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## 测试账号

| 角色 | 账号 | 密码 | 权限范围 |
|------|------|------|----------|
| 管理员（校长） | `admin` | `admin123` | 全部权限 |
| 院长 | `dean` | `123456` | 学院级权限 |
| 讲师 | `teacher` | `123456` | 基础权限 |

## 项目结构

```
rbac-admin/
├── public/                  # 静态资源
├── src/
│   ├── assets/              # 图片等资源文件
│   ├── components/          # 公共组件
│   │   ├── Layout/          #   布局组件（MainLayout / Header / Sidebar）
│   │   └── common/          #   通用组件（StatusTag / StatCard）
│   ├── hooks/               # 自定义 Hooks（usePermission）
│   ├── mocks/               # Mock 数据
│   │   └── data/            #   部门/角色/用户/菜单/岗位
│   ├── pages/               # 页面组件
│   │   ├── login/           #   登录页
│   │   ├── dashboard/       #   工作台
│   │   ├── department/      #   部门管理
│   │   ├── role/            #   角色管理
│   │   ├── user/            #   用户管理
│   │   ├── position/        #   岗位管理
│   │   ├── grade/           #   职级管理
│   │   └── menu/            #   菜单管理
│   ├── services/            # API 服务层（预留）
│   ├── stores/              # Zustand 状态管理
│   │   ├── authStore.ts     #   认证状态
│   │   ├── userStore.ts     #   用户管理状态
│   │   ├── roleStore.ts     #   角色管理状态
│   │   ├── departmentStore.ts  # 部门管理状态
│   │   ├── positionStore.ts #   岗位管理状态
│   │   ├── menuStore.ts     #   菜单管理状态
│   │   └── auditStore.ts    #   审计日志状态
│   ├── styles/              # 全局样式
│   ├── types/               # TypeScript 类型定义
│   ├── App.tsx              # 根组件（路由配置）
│   └── main.tsx             # 入口文件
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
└── package.json             # 项目依赖
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（HMR 热更新） |
| `npm run build` | TypeScript 编译 + 生产构建 |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | ESLint 代码检查 |

## 说明

当前版本为纯前端演示版，所有数据均为 Mock 数据，存储在 `src/mocks/data/` 中。如需对接后端 API，可在 `src/services/` 目录中实现请求层，替换各 Store 中的 Mock 调用。
