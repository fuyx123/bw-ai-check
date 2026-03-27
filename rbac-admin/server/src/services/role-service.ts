import { conflict, notFound } from '../shared/errors';
import { getPagination, paginate } from '../shared/pagination';
import { getQueryString, type QueryParams } from '../shared/http';
import type { AppStore } from '../data/store';
import type { AuthenticatedUser, DataScope, RoleRecord } from '../types';
import { AccessService } from './access-service';
import { AuditService } from './audit-service';

interface CreateRoleInput {
  name: string;
  description: string;
  dataScope: DataScope;
  menuIds: string[];
}

interface UpdateRoleInput {
  name?: string;
  description?: string;
  dataScope?: DataScope;
}

export class RoleService {
  constructor(
    private readonly store: AppStore,
    private readonly accessService: AccessService,
    private readonly auditService: AuditService,
  ) {}

  private ensureMenusExist(menuIds: string[]): void {
    menuIds.forEach((menuId) => {
      if (!this.store.menus.some((menu) => menu.id === menuId)) {
        notFound(`菜单不存在：${menuId}`);
      }
    });
  }

  list(query: QueryParams) {
    const keyword = getQueryString(query, 'keyword')?.toLowerCase();
    const { page, pageSize } = getPagination(query);

    const enriched = this.store.roles.map((role) => ({
      ...role,
      menuCount: role.permissions.length,
    }));

    const filtered = enriched.filter((role) => {
      if (!keyword) return true;
      return role.name.toLowerCase().includes(keyword) || role.description.toLowerCase().includes(keyword);
    });

    return paginate(filtered, page, pageSize);
  }

  getDetail(roleId: string) {
    const role = this.accessService.getRoleById(roleId);
    if (!role) notFound(`角色不存在：${roleId}`);
    return {
      role,
      menus: this.accessService.buildMenuTree(this.store.menus),
      permissions: role.permissions,
    };
  }

  create(currentUser: AuthenticatedUser, input: CreateRoleInput): RoleRecord {
    if (this.store.roles.some((role) => role.name === input.name)) {
      conflict(`角色名称已存在：${input.name}`);
    }
    this.ensureMenusExist(input.menuIds);

    const now = this.store.now();
    const role: RoleRecord = {
      id: this.store.createId('role'),
      name: input.name,
      description: input.description,
      dataScope: input.dataScope,
      permissions: [...new Set(input.menuIds)],
      userCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.store.roles.push(role);
    this.auditService.record({
      action: '创建角色',
      operator: currentUser.name,
      target: role.id,
      type: 'success',
      detail: `创建角色 ${role.name}`,
    });
    return role;
  }

  update(currentUser: AuthenticatedUser, roleId: string, input: UpdateRoleInput): RoleRecord {
    const index = this.store.roles.findIndex((role) => role.id === roleId);
    if (index === -1) notFound(`角色不存在：${roleId}`);

    const current = this.store.roles[index];
    if (input.name && input.name !== current.name && this.store.roles.some((role) => role.name === input.name && role.id !== roleId)) {
      conflict(`角色名称已存在：${input.name}`);
    }

    const updated: RoleRecord = {
      ...current,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      dataScope: input.dataScope ?? current.dataScope,
      updatedAt: this.store.now(),
    };

    this.store.roles[index] = updated;
    this.auditService.record({
      action: '更新角色',
      operator: currentUser.name,
      target: roleId,
      type: 'success',
      detail: `更新角色 ${updated.name}`,
    });
    return updated;
  }

  updateMenus(currentUser: AuthenticatedUser, roleId: string, menuIds: string[]): RoleRecord {
    const index = this.store.roles.findIndex((role) => role.id === roleId);
    if (index === -1) notFound(`角色不存在：${roleId}`);
    this.ensureMenusExist(menuIds);

    const updated: RoleRecord = {
      ...this.store.roles[index],
      permissions: [...new Set(menuIds)],
      updatedAt: this.store.now(),
    };

    this.store.roles[index] = updated;
    this.auditService.record({
      action: '更新角色权限',
      operator: currentUser.name,
      target: roleId,
      type: 'success',
      detail: `更新角色 ${updated.name} 的菜单权限`,
    });
    return updated;
  }

  delete(currentUser: AuthenticatedUser, roleId: string): void {
    const role = this.accessService.getRoleById(roleId);
    if (!role) notFound(`角色不存在：${roleId}`);

    const assigned = this.store.users.some((user) => user.roleIds.includes(roleId));
    if (assigned) {
      conflict('当前角色已被用户绑定，不能直接删除');
    }

    this.store.roles = this.store.roles.filter((entry) => entry.id !== roleId);
    this.auditService.record({
      action: '删除角色',
      operator: currentUser.name,
      target: roleId,
      type: 'warning',
      detail: `删除角色 ${role.name}`,
    });
  }
}
