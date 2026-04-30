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
  data_scope ENUM('school', 'college', 'major', 'class', 'personal') DEFAULT 'school' COMMENT '数据范围：school-学校级，college-学院级，major-专业级，class-班级级，personal-个人级',
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

-- 作业任务表
CREATE TABLE IF NOT EXISTS homework_tasks (
  id VARCHAR(64) PRIMARY KEY COMMENT '作业任务ID',
  title VARCHAR(255) NOT NULL COMMENT '作业标题',
  description TEXT COMMENT '作业说明',
  publish_date VARCHAR(32) NOT NULL COMMENT '发布日期',
  check_date VARCHAR(32) NOT NULL COMMENT '统计日期',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  KEY idx_publish_date (publish_date),
  KEY idx_check_date (check_date),
  KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业任务表';

-- 作业任务班级关联表
CREATE TABLE IF NOT EXISTS homework_task_classes (
  homework_id VARCHAR(64) NOT NULL COMMENT '作业任务ID',
  class_id VARCHAR(64) NOT NULL COMMENT '班级ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (homework_id, class_id),
  KEY idx_homework_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业任务班级关联表';

-- 作业提交表
CREATE TABLE IF NOT EXISTS homework_submissions (
  id VARCHAR(64) PRIMARY KEY COMMENT '提交ID',
  homework_id VARCHAR(64) NOT NULL COMMENT '作业任务ID',
  student_id VARCHAR(64) NOT NULL COMMENT '学生ID',
  student_name VARCHAR(128) NOT NULL COMMENT '学生姓名',
  class_id VARCHAR(64) NOT NULL COMMENT '班级ID',
  class_name VARCHAR(255) COMMENT '班级名称',
  archive_file_key VARCHAR(1024) NOT NULL COMMENT '压缩包存储Key',
  archive_original_name VARCHAR(512) NOT NULL COMMENT '压缩包原始文件名',
  doc_file_key VARCHAR(1024) COMMENT '作业文档存储Key',
  doc_original_name VARCHAR(512) COMMENT '作业文档文件名',
  doc_content LONGTEXT COMMENT '作业文档解析文本',
  code_summary LONGTEXT COMMENT '代码摘要',
  review_status VARCHAR(32) NOT NULL COMMENT '审批状态',
  review_score INT DEFAULT 0 COMMENT '审批得分',
  review_comment TEXT COMMENT '审批摘要',
  review_detail LONGTEXT COMMENT '结构化审批明细',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  reviewed_at TIMESTAMP NULL COMMENT '审批完成时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  KEY idx_homework_id (homework_id),
  KEY idx_student_id (student_id),
  KEY idx_class_id (class_id),
  KEY idx_review_status (review_status),
  KEY idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作业提交与审批结果表';
