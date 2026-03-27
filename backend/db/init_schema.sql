-- ============================================================
-- 八维智能阅卷平台 RBAC 数据库初始化脚本
-- Database: bw-ai-check
-- Charset: UTF-8
-- ============================================================

CREATE DATABASE IF NOT EXISTS bw_ai_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bw_ai_check;

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY COMMENT '部门唯一标识',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '部门代码',
  parent_id VARCHAR(50) COMMENT '父部门ID，用于构建树形结构',
  level ENUM('university', 'college', 'stage', 'major', 'class') NOT NULL COMMENT '部门级别：university-学校，college-学院，stage-阶段，major-专业，class-班级',
  leader_name VARCHAR(50) COMMENT '部门负责人名称',
  leader_title VARCHAR(50) COMMENT '部门负责人职务',
  staff_count INT DEFAULT 0 COMMENT '部门人员数量',
  status ENUM('operational') DEFAULT 'operational' COMMENT '部门状态：operational-正常运营',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (parent_id) REFERENCES departments(id),
  KEY idx_parent_id (parent_id),
  KEY idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门信息表：存储学校部门层级结构';

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY COMMENT '角色唯一标识',
  name VARCHAR(100) NOT NULL UNIQUE COMMENT '角色名称（校长、院长、讲师等）',
  description VARCHAR(255) COMMENT '角色描述',
  data_scope ENUM('school', 'college', 'major', 'class') DEFAULT 'school' COMMENT '数据范围：school-学校级，college-学院级，major-专业级，class-班级级',
  user_count INT DEFAULT 0 COMMENT '拥有该角色的用户数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_data_scope (data_scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色定义表：定义系统中的角色及其数据范围';

-- 菜单表
CREATE TABLE IF NOT EXISTS menus (
  id VARCHAR(50) PRIMARY KEY COMMENT '菜单唯一标识',
  name VARCHAR(100) NOT NULL COMMENT '菜单/按钮名称',
  path VARCHAR(255) COMMENT '路由路径（仅菜单有效）',
  icon VARCHAR(100) COMMENT '菜单图标类名',
  parent_id VARCHAR(50) COMMENT '父菜单ID，用于构建菜单树',
  sort_order INT DEFAULT 0 COMMENT '排序序号，值越小越靠前',
  visible BOOLEAN DEFAULT TRUE COMMENT '是否可见：TRUE-可见，FALSE-隐藏',
  type ENUM('menu', 'button') DEFAULT 'menu' COMMENT '菜单类型：menu-菜单项，button-操作按钮',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (parent_id) REFERENCES menus(id),
  KEY idx_parent_id (parent_id),
  KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单权限表：定义系统菜单和操作按钮权限';

-- 角色菜单权限关联表
CREATE TABLE IF NOT EXISTS role_menus (
  role_id VARCHAR(50) NOT NULL COMMENT '角色ID',
  menu_id VARCHAR(50) NOT NULL COMMENT '菜单ID',
  PRIMARY KEY (role_id, menu_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  KEY idx_menu_id (menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色菜单权限关联表：记录每个角色拥有的菜单权限';

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY COMMENT '用户唯一标识',
  name VARCHAR(100) NOT NULL COMMENT '用户姓名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '用户邮箱',
  avatar VARCHAR(255) COMMENT '用户头像URL',
  initials VARCHAR(10) COMMENT '用户名称缩写（首字母组合）',
  department_id VARCHAR(50) COMMENT '所属部门ID',
  access_status ENUM('full', 'partial', 'inactive') DEFAULT 'full' COMMENT '访问权限状态：full-完全权限，partial-部分权限，inactive-无权限',
  is_active BOOLEAN DEFAULT TRUE COMMENT '用户是否激活：TRUE-激活，FALSE-禁用',
  -- 用户类型与登录凭证
  user_type ENUM('student', 'staff') NOT NULL DEFAULT 'staff' COMMENT '用户类型：student-学生，staff-教职工',
  login_id VARCHAR(50) NOT NULL UNIQUE COMMENT '登录凭证：学号（学生）或职工号（教职工）',
  password_hash VARCHAR(255) COMMENT '密码哈希值（bcrypt）',
  -- 学生专属字段
  grade VARCHAR(20) COMMENT '年级，如 2023级（仅学生）',
  class_name VARCHAR(50) COMMENT '班级名称，如 计科2301（仅学生）',
  class_id VARCHAR(50) COMMENT '班级ID（仅学生）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  FOREIGN KEY (department_id) REFERENCES departments(id),
  KEY idx_department_id (department_id),
  KEY idx_email (email),
  KEY idx_access_status (access_status),
  KEY idx_user_type (user_type),
  KEY idx_login_id (login_id),
  KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表：统一存储学生和教职工，通过 user_type 区分';

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
  role_id VARCHAR(50) NOT NULL COMMENT '角色ID',
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  KEY idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表：记录用户拥有的角色（一个用户可以有多个角色）';

-- 岗位分类表
CREATE TABLE IF NOT EXISTS position_categories (
  code VARCHAR(50) PRIMARY KEY COMMENT '岗位分类代码',
  name VARCHAR(100) NOT NULL COMMENT '分类名称（教学、科研、行政、辅助等）',
  color VARCHAR(20) COMMENT '分类颜色代码（用于UI展示）',
  icon VARCHAR(100) COMMENT '分类图标类名',
  sort_order INT DEFAULT 0 COMMENT '排序序号',
  description VARCHAR(255) COMMENT '分类描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位分类表：定义岗位的分类（教学、科研、行政、辅助）';

-- 岗位表
CREATE TABLE IF NOT EXISTS positions (
  id VARCHAR(50) PRIMARY KEY COMMENT '岗位唯一标识',
  name VARCHAR(100) NOT NULL COMMENT '岗位名称（教授、讲师等）',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '岗位代码',
  category_code VARCHAR(50) COMMENT '岗位分类代码',
  level INT DEFAULT 1 COMMENT '岗位等级，值越大等级越高',
  description VARCHAR(255) COMMENT '岗位描述',
  headcount INT DEFAULT 1 COMMENT '岗位编制人数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (category_code) REFERENCES position_categories(code),
  KEY idx_category (category_code),
  KEY idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='岗位表：定义组织内的各类岗位';

-- 用户岗位关联表
CREATE TABLE IF NOT EXISTS user_positions (
  user_id VARCHAR(50) NOT NULL COMMENT '用户ID',
  position_id VARCHAR(50) NOT NULL COMMENT '岗位ID',
  PRIMARY KEY (user_id, position_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
  KEY idx_position_id (position_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户岗位关联表：记录用户承担的岗位（一个用户可以有多个岗位）';

-- 职级表
CREATE TABLE IF NOT EXISTS grades (
  id VARCHAR(50) PRIMARY KEY COMMENT '职级唯一标识',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '职级代码',
  name VARCHAR(100) NOT NULL COMMENT '职级名称（一级、二级等）',
  level INT NOT NULL COMMENT '职级等级，值越大等级越高',
  description VARCHAR(255) COMMENT '职级描述',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  KEY idx_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='职级表：定义教职员工的职级体系';

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(50) PRIMARY KEY COMMENT '日志唯一标识',
  action VARCHAR(100) NOT NULL COMMENT '操作类型（创建、修改、删除、导出等）',
  operator VARCHAR(100) COMMENT '操作人员名称或ID',
  target VARCHAR(255) COMMENT '操作目标（表名或具体对象ID）',
  type ENUM('info', 'warning', 'success') DEFAULT 'info' COMMENT '日志类型：info-信息，warning-警告，success-成功',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  KEY idx_action (action),
  KEY idx_operator (operator),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表：记录系统中的所有重要操作';
