import { conflict, notFound } from '../shared/errors';
import type { AppStore } from '../data/store';
import type { AuthenticatedUser, MenuItemType, MenuRecord } from '../types';
import { AccessService } from './access-service';
import { AuditService } from './audit-service';

interface CreateMenuInput {
  name: string;
  path: string;
  icon: string;
  parentId: string | null;
  type: MenuItemType;
  sortOrder: number;
  visible: boolean;
}

type UpdateMenuInput = Partial<CreateMenuInput>;

export class MenuService {
  constructor(
    private readonly store: AppStore,
    private readonly accessService: AccessService,
    private readonly auditService: AuditService,
  ) {}

  private getVisibleMenus(user: AuthenticatedUser): MenuRecord[] {
    const allowed = new Set(user.permissions);
    return this.store.menus.filter((menu) => allowed.has(menu.id));
  }

  getTreeForUser(user: AuthenticatedUser) {
    return this.accessService.buildMenuTree(this.getVisibleMenus(user));
  }

  getUserMenus(user: AuthenticatedUser) {
    const permissions = this.getVisibleMenus(user);
    const menus = permissions.filter((menu) => menu.type === 'menu' && menu.visible);

    return {
      menus: this.accessService.buildMenuTree(menus).map((menu) => ({
        ...menu,
        children: [],
      })),
      permissions: user.permissions,
    };
  }

  private assertParent(parentId: string | null, type: MenuItemType, currentId?: string): void {
    if (!parentId) return;
    const parent = this.store.menus.find((menu) => menu.id === parentId);
    if (!parent) {
      notFound(`父菜单不存在：${parentId}`);
    }
    if (parent.type !== 'menu') {
      conflict('按钮类型不能作为父节点');
    }
    if (currentId && parentId === currentId) {
      conflict('菜单不能挂载到自己下面');
    }
    if (type === 'menu' && parent.parentId) {
      conflict('仅支持二级菜单结构，子级菜单请配置为按钮');
    }
  }

  create(currentUser: AuthenticatedUser, input: CreateMenuInput): MenuRecord {
    this.assertParent(input.parentId, input.type);
    const now = this.store.now();
    const menu: MenuRecord = {
      id: this.store.createId('menu'),
      name: input.name,
      path: input.type === 'button' ? '' : input.path,
      icon: input.type === 'button' ? '' : input.icon,
      parentId: input.parentId,
      type: input.type,
      sortOrder: input.sortOrder,
      visible: input.visible,
      createdAt: now,
      updatedAt: now,
    };

    this.store.menus.push(menu);
    this.auditService.record({
      action: '创建菜单',
      operator: currentUser.name,
      target: menu.id,
      type: 'success',
      detail: `创建菜单 ${menu.name}`,
    });
    return menu;
  }

  update(currentUser: AuthenticatedUser, menuId: string, input: UpdateMenuInput): MenuRecord {
    const index = this.store.menus.findIndex((menu) => menu.id === menuId);
    if (index === -1) notFound(`菜单不存在：${menuId}`);

    const current = this.store.menus[index];
    const nextType = input.type ?? current.type;
    const nextParentId = input.parentId ?? current.parentId;
    this.assertParent(nextParentId, nextType, menuId);

    const updated: MenuRecord = {
      ...current,
      name: input.name ?? current.name,
      parentId: nextParentId,
      type: nextType,
      path: nextType === 'button' ? '' : (input.path ?? current.path),
      icon: nextType === 'button' ? '' : (input.icon ?? current.icon),
      sortOrder: input.sortOrder ?? current.sortOrder,
      visible: input.visible ?? current.visible,
      updatedAt: this.store.now(),
    };

    this.store.menus[index] = updated;
    this.auditService.record({
      action: '更新菜单',
      operator: currentUser.name,
      target: menuId,
      type: 'success',
      detail: `更新菜单 ${updated.name}`,
    });
    return updated;
  }

  delete(currentUser: AuthenticatedUser, menuId: string): void {
    const exists = this.store.menus.some((menu) => menu.id === menuId);
    if (!exists) notFound(`菜单不存在：${menuId}`);

    const toDelete = new Set<string>();
    const walk = (id: string) => {
      toDelete.add(id);
      this.store.menus
        .filter((menu) => menu.parentId === id)
        .forEach((menu) => walk(menu.id));
    };
    walk(menuId);

    this.store.menus = this.store.menus.filter((menu) => !toDelete.has(menu.id));
    this.store.roles = this.store.roles.map((role) => ({
      ...role,
      permissions: role.permissions.filter((permission) => !toDelete.has(permission)),
      updatedAt: this.store.now(),
    }));

    this.auditService.record({
      action: '删除菜单',
      operator: currentUser.name,
      target: menuId,
      type: 'warning',
      detail: `删除菜单及其下级节点，共 ${toDelete.size} 项`,
    });
  }
}
