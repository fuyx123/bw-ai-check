// RBAC 核心类型定义

export type DataScope = 'school' | 'college' | 'major' | 'class';
export type DepartmentStatus = 'operational';
export type AccessStatus = 'full' | 'partial' | 'inactive';
export type DepartmentLevel = 'university' | 'college' | 'major';
export type MenuItemType = 'menu' | 'button';

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
