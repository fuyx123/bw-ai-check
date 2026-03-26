// RBAC 核心类型定义

export type DataScope = 'school' | 'college' | 'major' | 'class';
export type DepartmentStatus = 'operational';
export type AccessStatus = 'full' | 'partial' | 'inactive';
export type DepartmentLevel = 'university' | 'college' | 'major' | 'class';
export type MenuItemType = 'menu' | 'button';
export type UserType = 'student' | 'staff';

export interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  visible: boolean;
  type: MenuItemType;
  children?: MenuItem[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // 菜单 ID 数组
  dataScope: DataScope;
  userCount: number;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials?: string;
  departmentId: string;
  departmentName: string;
  roleIds: string[];
  roleName: string;
  accessStatus: AccessStatus;
  userType: UserType;
  loginId: string;       // 学号（学生）或职工号（教职工）
  isActive: boolean;     // 账号激活状态
  createdAt?: string;    // 创建时间
  updatedAt?: string;    // 更新时间
  // 学生专属
  grade?: string;        // 年级，如 "2023级"
  classId?: string;
  className?: string;    // 班级名，如 "计科2301"
}

export interface DepartmentLeader {
  name: string;
  title: string;
  avatar?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: DepartmentLevel;
  leader: DepartmentLeader;
  staffCount: number;
  status: DepartmentStatus;
  updatedAt: string;
  children?: Department[];
}

export interface TreeNode {
  key: string;
  title: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
}

export interface AuditLog {
  id: string;
  action: string;
  operator: string;
  target: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success';
}

export type PositionCategoryCode = string;

export interface PositionCategory {
  id: string;
  code: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  description: string;
}

export interface Position {
  id: string;
  name: string;
  code: string;
  category: PositionCategoryCode;
  level: number;
  description: string;
  headcount: number;
  createdAt: string;
}
