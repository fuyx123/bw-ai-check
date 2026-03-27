import { forbidden, notFound } from '../shared/errors';
import type {
  AuthenticatedUser,
  DataScope,
  DepartmentLevel,
  DepartmentRecord,
  MenuRecord,
  RoleRecord,
  UserRecord,
} from '../types';
import type { AppStore } from '../data/store';

type DepartmentTreeNode = DepartmentRecord & { children: DepartmentTreeNode[] };
type MenuTreeNode = MenuRecord & { children: MenuTreeNode[] };

const departmentLevelOrder: Record<DepartmentLevel, number> = {
  university: 1,
  college: 2,
  stage: 3,
  major: 4,
  class: 5,
};

export class AccessService {
  constructor(private readonly store: AppStore) {}

  getUserById(userId: string): UserRecord | undefined {
    return this.store.users.find((user) => user.id === userId);
  }

  getRoleById(roleId: string): RoleRecord | undefined {
    return this.store.roles.find((role) => role.id === roleId);
  }

  getDepartmentById(departmentId: string): DepartmentRecord | undefined {
    return this.store.departments.find((department) => department.id === departmentId);
  }

  ensureDepartmentExists(departmentId: string): DepartmentRecord {
    return this.getDepartmentById(departmentId) || notFound(`部门不存在：${departmentId}`);
  }

  ensureUserExists(userId: string): UserRecord {
    return this.getUserById(userId) || notFound(`用户不存在：${userId}`);
  }

  ensureRoleExists(roleId: string): RoleRecord {
    return this.getRoleById(roleId) || notFound(`角色不存在：${roleId}`);
  }

  getPrimaryRole(user: UserRecord): { roleId: string; role: string; dataScope: DataScope } {
    const primaryRoleId = user.roleIds[0];
    if (!primaryRoleId) {
      return {
        roleId: 'role-student',
        role: '学生',
        dataScope: 'class',
      };
    }

    const role = this.getRoleById(primaryRoleId);
    if (!role) {
      return {
        roleId: primaryRoleId,
        role: user.roleName || primaryRoleId,
        dataScope: 'class',
      };
    }

    return {
      roleId: role.id,
      role: role.name,
      dataScope: role.dataScope,
    };
  }

  getPermissions(user: UserRecord): string[] {
    if (user.roleIds.length === 0) {
      return ['menu-dashboard'];
    }

    const permissions = new Set<string>();
    for (const roleId of user.roleIds) {
      const role = this.getRoleById(roleId);
      role?.permissions.forEach((permission) => permissions.add(permission));
    }
    return [...permissions];
  }

  toAuthenticatedUser(user: UserRecord): AuthenticatedUser {
    const primaryRole = this.getPrimaryRole(user);
    return {
      ...user,
      permissions: this.getPermissions(user),
      dataScope: primaryRole.dataScope,
      roleId: primaryRole.roleId,
      role: primaryRole.role,
    };
  }

  assertPermission(user: AuthenticatedUser, permission: string | string[]): void {
    const required = Array.isArray(permission) ? permission : [permission];
    const permissions = new Set(user.permissions);

    if (required.some((entry) => permissions.has(entry))) {
      return;
    }

    forbidden(`当前账号缺少必要权限：${required.join(' / ')}`);
  }

  buildDepartmentTree(departments: DepartmentRecord[]): DepartmentTreeNode[] {
    const map = new Map<string, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    for (const department of departments) {
      map.set(department.id, { ...department, children: [] });
    }

    for (const department of departments) {
      const node = map.get(department.id)!;
      if (department.parentId && map.has(department.parentId)) {
        map.get(department.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (nodes: DepartmentTreeNode[]): DepartmentTreeNode[] =>
      nodes
        .sort((left, right) => {
          const levelDiff = departmentLevelOrder[left.level] - departmentLevelOrder[right.level];
          return levelDiff || left.code.localeCompare(right.code);
        })
        .map((node) => ({
          ...node,
          children: sortNodes(node.children),
        }));

    return sortNodes(roots);
  }

  buildMenuTree(menus: MenuRecord[]): MenuTreeNode[] {
    const map = new Map<string, MenuTreeNode>();
    const roots: MenuTreeNode[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of menus) {
      const node = map.get(menu.id)!;
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (nodes: MenuTreeNode[]): MenuTreeNode[] =>
      nodes
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((node) => ({
          ...node,
          children: sortNodes(node.children),
        }));

    return sortNodes(roots);
  }

  getDescendantDepartmentIds(departmentId: string): Set<string> {
    const result = new Set<string>();
    const walk = (currentId: string) => {
      result.add(currentId);
      this.store.departments
        .filter((department) => department.parentId === currentId)
        .forEach((department) => walk(department.id));
    };
    walk(departmentId);
    return result;
  }

  getAncestorDepartments(departmentId: string): DepartmentRecord[] {
    const result: DepartmentRecord[] = [];
    let current = this.getDepartmentById(departmentId);

    while (current) {
      result.unshift(current);
      current = current.parentId ? this.getDepartmentById(current.parentId) : undefined;
    }

    return result;
  }

  getScopedDepartmentId(user: AuthenticatedUser): string | null {
    if (user.dataScope === 'school') {
      return 'dept-root';
    }

    const ancestors = this.getAncestorDepartments(user.classId || user.departmentId);

    if (user.dataScope === 'college') {
      return ancestors.find((department) => department.level === 'college')?.id || user.departmentId;
    }

    if (user.dataScope === 'major') {
      return ancestors.find((department) => department.level === 'stage' || department.level === 'major')?.id || user.departmentId;
    }

    return user.classId || user.departmentId;
  }

  canAccessDepartment(user: AuthenticatedUser, departmentId: string): boolean {
    const scopedId = this.getScopedDepartmentId(user);
    if (!scopedId) return false;
    const visibleIds = this.getDescendantDepartmentIds(scopedId);
    return visibleIds.has(departmentId);
  }

  filterDepartments(user: AuthenticatedUser, departments = this.store.departments): DepartmentRecord[] {
    if (user.dataScope === 'school') {
      return [...departments];
    }
    return departments.filter((department) => this.canAccessDepartment(user, department.id));
  }

  filterUsers(user: AuthenticatedUser, users = this.store.users): UserRecord[] {
    if (user.dataScope === 'school') {
      return [...users];
    }
    return users.filter((entry) => this.canAccessDepartment(user, entry.classId || entry.departmentId));
  }

  getDepartmentDisplayName(departmentId: string): string {
    const ancestors = this.getAncestorDepartments(departmentId);
    if (ancestors.length === 0) return departmentId;
    if (ancestors.length === 1) return ancestors[0].name;

    const names = ancestors
      .filter((department) => department.level !== 'university')
      .map((department) => department.name);

    return names.length > 0 ? names.join(' · ') : ancestors[ancestors.length - 1].name;
  }

  refreshUserDepartmentNames(): void {
    this.store.users = this.store.users.map((user) => ({
      ...user,
      departmentName: this.getDepartmentDisplayName(user.departmentId),
      className: user.classId ? this.getDepartmentById(user.classId)?.name || user.className : user.className,
    }));
  }

  recomputeRoleUserCounts(): void {
    this.store.roles = this.store.roles.map((role) => ({
      ...role,
      userCount: this.store.users.filter((user) => user.roleIds.includes(role.id)).length,
    }));
  }
}
