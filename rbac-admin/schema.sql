-- ============================================================
-- 教务管理系统 RBAC 数据库初始化脚本
-- Database: educational_admin
-- Charset: UTF-8
-- ============================================================

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(50) PRIMARY KEY COMMENT '部门唯一标识',
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '部门代码',
  parent_id VARCHAR(50) COMMENT '父部门ID，用于构建树形结构',
  level ENUM('university', 'college', 'major') NOT NULL COMMENT '部门级别：university-学校，college-学院，major-专业',
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
  -- 学生专属字段
  grade VARCHAR(20) COMMENT '年级，如 2023级（仅学生）',
  class_name VARCHAR(50) COMMENT '班级名称，如 计科2301（仅学生）',
  class_id VARCHAR(50) COMMENT '班级ID（仅学生）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (department_id) REFERENCES departments(id),
  KEY idx_department_id (department_id),
  KEY idx_email (email),
  KEY idx_access_status (access_status),
  KEY idx_user_type (user_type),
  KEY idx_login_id (login_id)
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

-- ============================================================
-- 初始数据 - 部门
-- ============================================================

INSERT INTO departments (id, name, code, parent_id, level, leader_name, leader_title, staff_count, status, updated_at) VALUES
('dept-root', '东南联合大学', 'SEUU', NULL, 'university', '赵明远', '校长', 1284, 'operational', '2024-01-15'),
('dept-ie', '信息工程学院', 'IE', 'dept-root', 'college', '刘建国', '院长', 312, 'operational', '2024-01-12'),
('dept-cs', '计算机科学与技术', 'CS', 'dept-ie', 'major', '李德', '副教授', 84, 'operational', '2023-11-24'),
('dept-cs-ai-lab', '智能计算实验室', 'CS-AI', 'dept-cs', 'major', '周鹏', '研究员', 18, 'operational', '2024-01-08'),
('dept-cs-sys', '系统与架构研究室', 'CS-SYS', 'dept-cs', 'major', '何坤', '副教授', 12, 'operational', '2024-01-05'),
('dept-se', '软件工程', 'SE', 'dept-ie', 'major', '王芳', '教授', 96, 'operational', '2024-01-10'),
('dept-se-cloud', '云计算研究室', 'SE-CLOUD', 'dept-se', 'major', '吴刚', '讲师', 15, 'operational', '2024-01-07'),
('dept-network', '网络工程', 'NET', 'dept-ie', 'major', '张明', '教授', 56, 'operational', '2024-01-09'),
('dept-review', '学术评审部', 'REVIEW', 'dept-root', 'college', NULL, NULL, 28, 'operational', '2024-01-14'),
('dept-outreach', '全球外联部', 'OUTREACH', 'dept-root', 'college', NULL, NULL, 15, 'operational', '2024-01-14'),
('dept-ethics', '机构伦理部', 'ETHICS', 'dept-root', 'college', NULL, NULL, 12, 'operational', '2024-01-13'),
('dept-editorial', '编辑委员会', 'EDITORIAL', 'dept-root', 'college', NULL, NULL, 8, 'operational', '2024-01-13');

-- ============================================================
-- 初始数据 - 角色
-- ============================================================

INSERT INTO roles (id, name, description, data_scope, user_count) VALUES
('role-president', '校长', '学校最高行政负责人，拥有全部权限', 'school', 1),
('role-dean', '院长', '学院负责人，管理学院事务', 'college', 8),
('role-academic-director', '教务处长', '负责教务管理、课程审批和学术质量监控', 'school', 4),
('role-major-lead', '专业负责人', '负责专业相关的教学管理', 'major', 12),
('role-lecturer', '讲师', '教学和科研人员，基础权限', 'class', 156),
('role-admin-office', '行政办公室', '负责日常行政管理和综合协调', 'school', 12);

-- ============================================================
-- 初始数据 - 菜单
-- ============================================================

INSERT INTO menus (id, name, path, icon, parent_id, sort_order, visible, type) VALUES
-- 主菜单
('menu-dashboard', '工作台', '/dashboard', 'DashboardOutlined', NULL, 1, TRUE, 'menu'),
('menu-dept', '部门管理', '/departments', 'ApartmentOutlined', NULL, 2, TRUE, 'menu'),
('menu-role', '角色管理', '/roles', 'TeamOutlined', NULL, 3, TRUE, 'menu'),
('menu-user', '用户管理', '/users', 'UserOutlined', NULL, 4, TRUE, 'menu'),
('menu-position', '职位管理', '/positions', 'SolutionOutlined', NULL, 5, TRUE, 'menu'),
('menu-grade', '职级管理', '/grades', 'BarChartOutlined', NULL, 6, TRUE, 'menu'),
('menu-menu', '菜单管理', '/menus', 'MenuOutlined', NULL, 7, TRUE, 'menu'),

-- 部门管理操作按钮
('menu-dept-add', '新增部门', '', '', 'menu-dept', 1, TRUE, 'button'),
('menu-dept-edit', '编辑部门', '', '', 'menu-dept', 2, TRUE, 'button'),
('menu-dept-delete', '删除部门', '', '', 'menu-dept', 3, TRUE, 'button'),
('menu-dept-export', '导出架构', '', '', 'menu-dept', 4, TRUE, 'button'),

-- 角色管理操作按钮
('menu-role-add', '创建角色', '', '', 'menu-role', 1, TRUE, 'button'),
('menu-role-edit', '编辑角色', '', '', 'menu-role', 2, TRUE, 'button'),
('menu-role-delete', '删除角色', '', '', 'menu-role', 3, TRUE, 'button'),
('menu-role-assign', '分配权限', '', '', 'menu-role', 4, TRUE, 'button'),

-- 用户管理操作按钮
('menu-user-add', '新增用户', '', '', 'menu-user', 1, TRUE, 'button'),
('menu-user-edit', '编辑用户', '', '', 'menu-user', 2, TRUE, 'button'),
('menu-user-delete', '删除用户', '', '', 'menu-user', 3, TRUE, 'button'),

-- 职位管理操作按钮
('menu-pos-add', '新增职位', '', '', 'menu-position', 1, TRUE, 'button'),
('menu-pos-edit', '编辑职位', '', '', 'menu-position', 2, TRUE, 'button'),
('menu-pos-delete', '删除职位', '', '', 'menu-position', 3, TRUE, 'button'),

-- 菜单管理操作按钮
('menu-menu-add', '新增菜单', '', '', 'menu-menu', 1, TRUE, 'button'),
('menu-menu-edit', '编辑菜单', '', '', 'menu-menu', 2, TRUE, 'button'),
('menu-menu-delete', '删除菜单', '', '', 'menu-menu', 3, TRUE, 'button');

-- ============================================================
-- 初始数据 - 角色菜单权限
-- ============================================================

INSERT INTO role_menus (role_id, menu_id) VALUES
-- 校长：全部权限
('role-president', 'menu-dashboard'),
('role-president', 'menu-dept'),
('role-president', 'menu-dept-add'),
('role-president', 'menu-dept-edit'),
('role-president', 'menu-dept-delete'),
('role-president', 'menu-dept-export'),
('role-president', 'menu-role'),
('role-president', 'menu-role-add'),
('role-president', 'menu-role-edit'),
('role-president', 'menu-role-delete'),
('role-president', 'menu-role-assign'),
('role-president', 'menu-user'),
('role-president', 'menu-user-add'),
('role-president', 'menu-user-edit'),
('role-president', 'menu-user-delete'),
('role-president', 'menu-position'),
('role-president', 'menu-pos-add'),
('role-president', 'menu-pos-edit'),
('role-president', 'menu-pos-delete'),
('role-president', 'menu-grade'),
('role-president', 'menu-menu'),
('role-president', 'menu-menu-add'),
('role-president', 'menu-menu-edit'),
('role-president', 'menu-menu-delete'),

-- 行政办公室：部门、用户、职位管理权限
('role-admin-office', 'menu-dashboard'),
('role-admin-office', 'menu-dept'),
('role-admin-office', 'menu-dept-add'),
('role-admin-office', 'menu-dept-edit'),
('role-admin-office', 'menu-dept-export'),
('role-admin-office', 'menu-user'),
('role-admin-office', 'menu-user-add'),
('role-admin-office', 'menu-user-edit'),
('role-admin-office', 'menu-position'),
('role-admin-office', 'menu-pos-add'),
('role-admin-office', 'menu-pos-edit'),

-- 教务处长：部门、用户、职级、职位查看
('role-academic-director', 'menu-dashboard'),
('role-academic-director', 'menu-dept'),
('role-academic-director', 'menu-user'),
('role-academic-director', 'menu-user-edit'),
('role-academic-director', 'menu-grade'),
('role-academic-director', 'menu-position'),

-- 院长：部门、用户、职位查看和编辑权限
('role-dean', 'menu-dashboard'),
('role-dean', 'menu-dept'),
('role-dean', 'menu-user'),
('role-dean', 'menu-user-edit'),
('role-dean', 'menu-position'),

-- 讲师：工作台、用户基本查看
('role-lecturer', 'menu-dashboard'),
('role-lecturer', 'menu-user');

-- ============================================================
-- 初始数据 - 用户
-- ============================================================

INSERT INTO users (id, name, email, avatar, initials, department_id, access_status, is_active) VALUES
('user-001', 'Dr. Elena Rodriguez', 'elena.rodriguez@seuu.edu', NULL, 'ER', 'dept-review', 'full', TRUE),
('user-002', '陈伟', 'chen.wei@seuu.edu', NULL, 'CW', 'dept-outreach', 'full', TRUE),
('user-003', 'Sarah Jenkins', 'sarah.jenkins@seuu.edu', NULL, 'SJ', 'dept-ethics', 'partial', TRUE),
('user-004', 'Marcus Low', 'marcus.low@seuu.edu', NULL, 'ML', 'dept-editorial', 'inactive', TRUE),
('user-005', '赵明远', 'zhao@seuu.edu', NULL, 'ZMY', 'dept-root', 'full', TRUE),
('user-006', '刘建国', 'liu@seuu.edu', NULL, 'LJG', 'dept-ie', 'full', TRUE),
('user-007', '李德', 'li.de@seuu.edu', NULL, 'LD', 'dept-cs', 'full', TRUE),
('user-008', '周鹏', 'zhou.peng@seuu.edu', NULL, 'ZP', 'dept-cs-ai-lab', 'full', TRUE),
('user-009', '何坤', 'he.kun@seuu.edu', NULL, 'HK', 'dept-cs-sys', 'full', TRUE),
('user-010', '王芳', 'wang.fang@seuu.edu', NULL, 'WF', 'dept-se', 'full', TRUE);

-- ============================================================
-- 初始数据 - 用户角色
-- ============================================================

INSERT INTO user_roles (user_id, role_id) VALUES
('user-001', 'role-academic-director'),
('user-002', 'role-admin-office'),
('user-003', 'role-major-lead'),
('user-004', 'role-lecturer'),
('user-005', 'role-president'),
('user-006', 'role-dean'),
('user-007', 'role-major-lead'),
('user-008', 'role-lecturer'),
('user-009', 'role-lecturer'),
('user-010', 'role-dean');

-- ============================================================
-- 初始数据 - 岗位分类
-- ============================================================

INSERT INTO position_categories (code, name, color, icon, sort_order, description) VALUES
('teaching', '教学岗位', '#FF6B6B', 'BookOutlined', 1, '负责教学工作的岗位'),
('research', '科研岗位', '#4ECDC4', 'ExperimentOutlined', 2, '负责科研工作的岗位'),
('admin', '行政岗位', '#45B7D1', 'FileOutlined', 3, '负责行政管理的岗位'),
('support', '辅助岗位', '#96CEB4', 'TeamOutlined', 4, '提供支持服务的岗位');

-- ============================================================
-- 初始数据 - 岗位
-- ============================================================

INSERT INTO positions (id, name, code, category_code, level, description, headcount) VALUES
('pos-001', '教授', 'PROF', 'teaching', 4, '大学教授职位', 45),
('pos-002', '副教授', 'ASSOC-PROF', 'teaching', 3, '大学副教授职位', 78),
('pos-003', '讲师', 'LECTURER', 'teaching', 2, '大学讲师职位', 156),
('pos-004', '助教', 'TA', 'teaching', 1, '教学助理', 89),
('pos-005', '研究员', 'RESEARCHER', 'research', 3, '专职研究人员', 34),
('pos-006', '院长', 'DEAN', 'admin', 4, '学院行政领导', 12),
('pos-007', '系主任', 'DEPT-HEAD', 'admin', 3, '系级行政领导', 28),
('pos-008', '行政秘书', 'SECRETARY', 'admin', 1, '行政事务处理', 42),
('pos-009', '图书管理员', 'LIBRARIAN', 'support', 2, '图书馆工作人员', 18),
('pos-010', '实验员', 'LAB-TECH', 'support', 1, '实验室技术支持', 56);

-- ============================================================
-- 初始数据 - 职级
-- ============================================================

INSERT INTO grades (id, code, name, level, description) VALUES
('grade-001', 'G1', '一级', 1, '最低等级'),
('grade-002', 'G2', '二级', 2, '初级等级'),
('grade-003', 'G3', '三级', 3, '中级等级'),
('grade-004', 'G4', '四级', 4, '高级等级'),
('grade-005', 'G5', '五级', 5, '专家等级'),
('grade-006', 'G6', '六级', 6, '顶级等级');

-- ============================================================
-- 初始数据 - 用户岗位关联
-- ============================================================

INSERT INTO user_positions (user_id, position_id) VALUES
('user-005', 'pos-006'),
('user-006', 'pos-006'),
('user-007', 'pos-002'),
('user-008', 'pos-003'),
('user-009', 'pos-003'),
('user-010', 'pos-006');

-- ============================================================
-- 初始数据 - 审计日志
-- ============================================================

INSERT INTO audit_logs (id, action, operator, target, type) VALUES
('audit-001', '创建用户', 'admin', 'user-001', 'success'),
('audit-002', '修改角色权限', 'admin', 'role-dean', 'success'),
('audit-003', '删除部门', 'admin', 'dept-editorial', 'warning'),
('audit-004', '用户登录', 'user-001', 'system', 'info'),
('audit-005', '导出部门架构', 'user-002', 'departments', 'success');
