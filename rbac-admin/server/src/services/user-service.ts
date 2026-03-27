import { conflict, notFound } from '../shared/errors';
import { getPagination, paginate } from '../shared/pagination';
import { getQueryString, type QueryParams } from '../shared/http';
import type { AppStore } from '../data/store';
import type { AccessStatus, AuthenticatedUser, UserRecord, UserType } from '../types';
import { AccessService } from './access-service';
import { AuditService } from './audit-service';
import { AuthService } from './auth-service';

interface CreateUserInput {
  name: string;
  email: string;
  loginId: string;
  userType: UserType;
  departmentId: string;
  roleIds?: string[];
  accessStatus?: AccessStatus;
  isActive?: boolean;
  avatar?: string;
  grade?: string;
  className?: string;
  classId?: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  departmentId?: string;
  roleIds?: string[];
  accessStatus?: AccessStatus;
  isActive?: boolean;
  avatar?: string;
  grade?: string;
  className?: string;
  classId?: string;
}

export class UserService {
  constructor(
    private readonly store: AppStore,
    private readonly accessService: AccessService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  private getRoleName(roleIds: string[], userType: UserType): string {
    if (userType === 'student') {
      return '学生';
    }
    return roleIds
      .map((roleId) => this.accessService.getRoleById(roleId)?.name || roleId)
      .join('、');
  }

  private assertDepartmentScope(currentUser: AuthenticatedUser, departmentId: string): void {
    this.accessService.ensureDepartmentExists(departmentId);
    if (!this.accessService.canAccessDepartment(currentUser, departmentId)) {
      conflict('当前账号只能操作自己数据权限范围内的用户');
    }
  }

  list(currentUser: AuthenticatedUser, query: QueryParams) {
    const visible = this.accessService.filterUsers(currentUser);
    const keyword = getQueryString(query, 'keyword')?.toLowerCase();
    const roleId = getQueryString(query, 'roleId');
    const departmentId = getQueryString(query, 'departmentId');
    const userType = getQueryString(query, 'userType');
    const { page, pageSize } = getPagination(query);

    const filtered = visible.filter((user) => {
      if (departmentId && user.departmentId !== departmentId) return false;
      if (roleId && !user.roleIds.includes(roleId)) return false;
      if (userType && user.userType !== userType) return false;
      if (!keyword) return true;
      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.loginId.toLowerCase().includes(keyword)
      );
    });

    return paginate(filtered, page, pageSize);
  }

  getById(currentUser: AuthenticatedUser, userId: string): UserRecord {
    const user = this.accessService.getUserById(userId);
    if (!user) notFound(`用户不存在：${userId}`);
    if (!this.accessService.canAccessDepartment(currentUser, user.classId || user.departmentId)) {
      notFound(`无权访问用户：${userId}`);
    }
    return user;
  }

  create(currentUser: AuthenticatedUser, input: CreateUserInput): UserRecord {
    this.assertDepartmentScope(currentUser, input.departmentId);
    if (input.classId) {
      this.assertDepartmentScope(currentUser, input.classId);
    }

    if (this.store.users.some((user) => user.email === input.email)) {
      conflict(`邮箱已存在：${input.email}`);
    }
    this.authService.ensureUniqueLogin(input.loginId);

    const createdAt = this.store.now();
    const roleIds = input.userType === 'student' ? [] : (input.roleIds || []);
    if (input.userType === 'staff' && roleIds.length === 0) {
      conflict('教职工至少需要分配一个角色');
    }
    roleIds.forEach((roleId) => this.accessService.ensureRoleExists(roleId));

    const user: UserRecord = {
      id: this.store.createId(input.userType === 'student' ? 'stu' : 'user'),
      name: input.name,
      email: input.email,
      avatar: input.avatar,
      initials: input.name.slice(0, 2),
      departmentId: input.departmentId,
      departmentName: this.accessService.getDepartmentDisplayName(input.departmentId),
      roleIds,
      roleName: this.getRoleName(roleIds, input.userType),
      accessStatus: input.accessStatus || 'full',
      userType: input.userType,
      loginId: input.loginId,
      isActive: input.isActive ?? true,
      grade: input.userType === 'student' ? input.grade : undefined,
      classId: input.userType === 'student' ? input.classId : undefined,
      className: input.userType === 'student' ? input.className : undefined,
      createdAt,
      updatedAt: createdAt,
    };

    this.store.users.push(user);
    this.accessService.recomputeRoleUserCounts();
    this.auditService.record({
      action: '创建用户',
      operator: currentUser.name,
      target: user.id,
      type: 'success',
      detail: `创建用户 ${user.name}`,
    });
    return user;
  }

  update(currentUser: AuthenticatedUser, userId: string, input: UpdateUserInput): UserRecord {
    const index = this.store.users.findIndex((user) => user.id === userId);
    if (index === -1) notFound(`用户不存在：${userId}`);

    const current = this.store.users[index];
    if (!this.accessService.canAccessDepartment(currentUser, current.classId || current.departmentId)) {
      conflict('当前账号只能编辑自己权限范围内的用户');
    }

    const nextDepartmentId = input.departmentId || current.departmentId;
    const nextClassId = current.userType === 'student' ? input.classId || current.classId : undefined;
    this.assertDepartmentScope(currentUser, nextDepartmentId);
    if (nextClassId) this.assertDepartmentScope(currentUser, nextClassId);

    if (input.email && input.email !== current.email && this.store.users.some((user) => user.email === input.email && user.id !== userId)) {
      conflict(`邮箱已存在：${input.email}`);
    }

    const nextRoleIds = current.userType === 'student' ? [] : input.roleIds ?? current.roleIds;
    if (current.userType === 'staff' && nextRoleIds.length === 0) {
      conflict('教职工至少需要分配一个角色');
    }
    nextRoleIds.forEach((roleId) => this.accessService.ensureRoleExists(roleId));

    const updated: UserRecord = {
      ...current,
      name: input.name ?? current.name,
      email: input.email ?? current.email,
      avatar: input.avatar ?? current.avatar,
      departmentId: nextDepartmentId,
      departmentName: this.accessService.getDepartmentDisplayName(nextDepartmentId),
      roleIds: nextRoleIds,
      roleName: this.getRoleName(nextRoleIds, current.userType),
      accessStatus: input.accessStatus ?? current.accessStatus,
      isActive: input.isActive ?? current.isActive,
      grade: current.userType === 'student' ? input.grade ?? current.grade : undefined,
      classId: current.userType === 'student' ? nextClassId : undefined,
      className: current.userType === 'student' ? input.className ?? current.className : undefined,
      updatedAt: this.store.now(),
    };

    this.store.users[index] = updated;
    if (!updated.isActive || updated.accessStatus === 'inactive') {
      this.authService.invalidateUserSessions(updated.id);
    }
    this.accessService.recomputeRoleUserCounts();
    this.auditService.record({
      action: '更新用户',
      operator: currentUser.name,
      target: userId,
      type: 'success',
      detail: `更新用户 ${updated.name}`,
    });
    return updated;
  }

  delete(currentUser: AuthenticatedUser, userId: string): void {
    const user = this.accessService.getUserById(userId);
    if (!user) notFound(`用户不存在：${userId}`);
    if (!this.accessService.canAccessDepartment(currentUser, user.classId || user.departmentId)) {
      conflict('当前账号只能删除自己权限范围内的用户');
    }

    this.store.users = this.store.users.filter((entry) => entry.id !== userId);
    this.authService.invalidateUserSessions(userId);
    this.accessService.recomputeRoleUserCounts();
    this.auditService.record({
      action: '删除用户',
      operator: currentUser.name,
      target: userId,
      type: 'warning',
      detail: `删除用户 ${user.name}`,
    });
  }

  updateStatus(currentUser: AuthenticatedUser, userId: string, isActive: boolean, reason?: string) {
    const updated = this.update(currentUser, userId, {
      isActive,
      accessStatus: isActive ? undefined : 'inactive',
    });

    this.auditService.record({
      action: isActive ? '启用用户' : '停用用户',
      operator: currentUser.name,
      target: userId,
      type: isActive ? 'success' : 'warning',
      detail: reason || (isActive ? '恢复账号访问' : '禁用账号访问'),
    });

    return updated;
  }
}
