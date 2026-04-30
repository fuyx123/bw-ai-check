export type DataScope = 'school' | 'college' | 'major' | 'class' | 'personal';
export type DepartmentStatus = 'operational';
export type DepartmentLevel = 'university' | 'college' | 'stage' | 'major' | 'class';
export type MenuItemType = 'menu' | 'button';
export type AccessStatus = 'full' | 'partial' | 'inactive';
export type UserType = 'staff' | 'student';
export type AuditLogType = 'info' | 'warning' | 'success';

export interface DepartmentLeader {
  name: string;
  title: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: DepartmentLevel;
  leader: DepartmentLeader;
  leaderName: string;
  leaderTitle: string;
  staffCount: number;
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MenuRecord {
  id: string;
  name: string;
  path: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  visible: boolean;
  type: MenuItemType;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  dataScope: DataScope;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
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
  loginId: string;
  isActive: boolean;
  grade?: string;
  classId?: string;
  className?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeRecord {
  id: string;
  code: string;
  name: string;
  level: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  operator: string;
  target: string;
  type: AuditLogType;
  detail?: string;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface AuthenticatedUser extends UserRecord {
  permissions: string[];
  dataScope: DataScope;
  roleId: string;
  role: string;
}

export interface LoginPayload {
  username?: string;
  loginId?: string;
  password: string;
  userType?: UserType;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SeedData {
  departments: DepartmentRecord[];
  menus: MenuRecord[];
  roles: RoleRecord[];
  users: UserRecord[];
  grades: GradeRecord[];
  auditLogs: AuditLogRecord[];
}
