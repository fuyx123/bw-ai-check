import { getPagination } from '../shared/pagination';
import { asObject, getAccessStatus, getBoolean, getDataScope, getDepartmentLevel, getMenuType, getNumber, getString, getStringArray, getUserType } from '../shared/validation';
import type { Router } from '../shared/router';
import type { AppContext } from '../core/context';
import type { AuthenticatedUser } from '../types';
import type { RequestContext } from '../shared/router';

function withUser(context: RequestContext<AppContext>): AuthenticatedUser {
  if (!context.currentUser) {
    throw new Error('missing current user');
  }
  return context.currentUser as AuthenticatedUser;
}

export function registerRoutes(router: Router<AppContext>): void {
  router.register({
    method: 'GET',
    path: '/api/health',
    handler: () => ({
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/auth/login',
    handler: (context) => {
      const body = asObject(context.body);
      const result = context.app.services.authService.login({
        username: getString(body, 'username'),
        loginId: getString(body, 'loginId'),
        password: getString(body, 'password', { required: true })!,
        userType: getUserType(body, 'userType', false),
      });

      return {
        message: '登录成功',
        data: result,
      };
    },
  });

  router.register({
    method: 'POST',
    path: '/api/auth/logout',
    auth: true,
    handler: (context) => {
      context.app.services.authService.logout(context.req.headers);
      return {
        message: '登出成功',
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/auth/me',
    auth: true,
    handler: (context) => ({
      data: withUser(context),
    }),
  });

  router.register({
    method: 'GET',
    path: '/api/departments/tree',
    auth: true,
    permission: 'menu-dept',
    handler: (context) => ({
      data: context.app.services.departmentService.getTree(withUser(context)),
    }),
  });

  router.register({
    method: 'GET',
    path: '/api/departments',
    auth: true,
    permission: 'menu-dept',
    handler: (context) => ({
      data: context.app.services.departmentService.list(withUser(context), context.query),
    }),
  });

  router.register({
    method: 'GET',
    path: '/api/departments/:id',
    auth: true,
    permission: 'menu-dept',
    handler: (context) => ({
      data: context.app.services.departmentService.getById(withUser(context), context.params.id),
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/departments',
    auth: true,
    permission: 'menu-dept-add',
    handler: (context) => {
      const body = asObject(context.body);
      const created = context.app.services.departmentService.create(withUser(context), {
        name: getString(body, 'name', { required: true })!,
        code: getString(body, 'code', { required: true })!,
        parentId: getString(body, 'parentId', { allowEmpty: true }) || null,
        level: getDepartmentLevel(body, 'level', true)!,
        leaderName: getString(body, 'leaderName', { required: true })!,
        leaderTitle: getString(body, 'leaderTitle', { required: true })!,
        staffCount: getNumber(body, 'staffCount', { required: true, min: 0 })!,
      });

      return {
        statusCode: 201,
        message: '部门创建成功',
        data: created,
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/departments/:id',
    auth: true,
    permission: 'menu-dept-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const updated = context.app.services.departmentService.update(withUser(context), context.params.id, {
        name: getString(body, 'name'),
        code: getString(body, 'code'),
        leaderName: getString(body, 'leaderName'),
        leaderTitle: getString(body, 'leaderTitle'),
        staffCount: getNumber(body, 'staffCount', { min: 0 }),
      });

      return {
        message: '部门更新成功',
        data: updated,
      };
    },
  });

  router.register({
    method: 'DELETE',
    path: '/api/departments/:id',
    auth: true,
    permission: 'menu-dept-delete',
    handler: (context) => {
      context.app.services.departmentService.delete(withUser(context), context.params.id);
      return {
        message: '部门删除成功',
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/users',
    auth: true,
    permission: 'menu-user',
    handler: (context) => ({
      data: context.app.services.userService.list(withUser(context), context.query),
    }),
  });

  router.register({
    method: 'GET',
    path: '/api/users/:id',
    auth: true,
    permission: 'menu-user',
    handler: (context) => ({
      data: context.app.services.userService.getById(withUser(context), context.params.id),
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/users',
    auth: true,
    permission: 'menu-user-add',
    handler: (context) => {
      const body = asObject(context.body);
      const created = context.app.services.userService.create(withUser(context), {
        name: getString(body, 'name', { required: true })!,
        email: getString(body, 'email', { required: true })!,
        loginId: getString(body, 'loginId', { required: true })!,
        userType: getUserType(body, 'userType', true)!,
        departmentId: getString(body, 'departmentId', { required: true })!,
        roleIds: getStringArray(body, 'roleIds'),
        accessStatus: getAccessStatus(body, 'accessStatus'),
        isActive: getBoolean(body, 'isActive'),
        avatar: getString(body, 'avatar'),
        grade: getString(body, 'grade'),
        className: getString(body, 'className'),
        classId: getString(body, 'classId'),
      });

      return {
        statusCode: 201,
        message: '用户创建成功',
        data: created,
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/users/:id',
    auth: true,
    permission: 'menu-user-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const updated = context.app.services.userService.update(withUser(context), context.params.id, {
        name: getString(body, 'name'),
        email: getString(body, 'email'),
        departmentId: getString(body, 'departmentId'),
        roleIds: getStringArray(body, 'roleIds'),
        accessStatus: getAccessStatus(body, 'accessStatus'),
        isActive: getBoolean(body, 'isActive'),
        avatar: getString(body, 'avatar'),
        grade: getString(body, 'grade'),
        className: getString(body, 'className'),
        classId: getString(body, 'classId'),
      });

      return {
        message: '用户更新成功',
        data: updated,
      };
    },
  });

  router.register({
    method: 'DELETE',
    path: '/api/users/:id',
    auth: true,
    permission: 'menu-user-delete',
    handler: (context) => {
      context.app.services.userService.delete(withUser(context), context.params.id);
      return {
        message: '用户删除成功',
      };
    },
  });

  router.register({
    method: 'PATCH',
    path: '/api/users/:id/status',
    auth: true,
    permission: 'menu-user-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const updated = context.app.services.userService.updateStatus(
        withUser(context),
        context.params.id,
        getBoolean(body, 'isActive', { required: true })!,
        getString(body, 'reason'),
      );

      return {
        message: '用户状态已更新',
        data: {
          id: updated.id,
          name: updated.name,
          isActive: updated.isActive,
          updatedAt: updated.updatedAt,
        },
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/roles',
    auth: true,
    permission: 'menu-role',
    handler: (context) => ({
      data: context.app.services.roleService.list(context.query),
    }),
  });

  router.register({
    method: 'GET',
    path: '/api/roles/:id/menus',
    auth: true,
    permission: 'menu-role',
    handler: (context) => ({
      data: context.app.services.roleService.getDetail(context.params.id),
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/roles',
    auth: true,
    permission: 'menu-role-add',
    handler: (context) => {
      const body = asObject(context.body);
      const role = context.app.services.roleService.create(withUser(context), {
        name: getString(body, 'name', { required: true })!,
        description: getString(body, 'description', { required: true })!,
        dataScope: getDataScope(body, 'dataScope', true)!,
        menuIds: getStringArray(body, 'menuIds', { required: true })!,
      });

      return {
        statusCode: 201,
        message: '角色创建成功',
        data: {
          ...role,
          menuCount: role.permissions.length,
        },
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/roles/:id',
    auth: true,
    permission: 'menu-role-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const role = context.app.services.roleService.update(withUser(context), context.params.id, {
        name: getString(body, 'name'),
        description: getString(body, 'description'),
        dataScope: getDataScope(body, 'dataScope'),
      });

      return {
        message: '角色更新成功',
        data: {
          ...role,
          menuCount: role.permissions.length,
        },
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/roles/:id/menus',
    auth: true,
    permission: 'menu-role-assign',
    handler: (context) => {
      const body = asObject(context.body);
      const role = context.app.services.roleService.updateMenus(
        withUser(context),
        context.params.id,
        getStringArray(body, 'menuIds', { required: true })!,
      );

      return {
        message: '角色权限更新成功',
        data: {
          id: role.id,
          name: role.name,
          menuCount: role.permissions.length,
          updatedAt: role.updatedAt,
        },
      };
    },
  });

  router.register({
    method: 'DELETE',
    path: '/api/roles/:id',
    auth: true,
    permission: 'menu-role-delete',
    handler: (context) => {
      context.app.services.roleService.delete(withUser(context), context.params.id);
      return {
        message: '角色删除成功',
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/menus/tree',
    auth: true,
    handler: (context) => ({
      data: context.app.services.menuService.getTreeForUser(withUser(context)),
    }),
  });

  router.register({
    method: 'GET',
    path: '/api/menus/user-menus',
    auth: true,
    handler: (context) => ({
      data: context.app.services.menuService.getUserMenus(withUser(context)),
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/menus',
    auth: true,
    permission: 'menu-menu-add',
    handler: (context) => {
      const body = asObject(context.body);
      const menu = context.app.services.menuService.create(withUser(context), {
        name: getString(body, 'name', { required: true })!,
        path: getString(body, 'path', { allowEmpty: true }) || '',
        icon: getString(body, 'icon', { allowEmpty: true }) || '',
        parentId: getString(body, 'parentId', { allowEmpty: true }) || null,
        type: getMenuType(body, 'type', true)!,
        sortOrder: getNumber(body, 'sortOrder', { required: true, min: 0 })!,
        visible: getBoolean(body, 'visible', { required: true })!,
      });

      return {
        statusCode: 201,
        message: '菜单创建成功',
        data: menu,
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/menus/:id',
    auth: true,
    permission: 'menu-menu-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const menu = context.app.services.menuService.update(withUser(context), context.params.id, {
        name: getString(body, 'name'),
        path: getString(body, 'path', { allowEmpty: true }),
        icon: getString(body, 'icon', { allowEmpty: true }),
        parentId: getString(body, 'parentId', { allowEmpty: true }) || undefined,
        type: getMenuType(body, 'type'),
        sortOrder: getNumber(body, 'sortOrder', { min: 0 }),
        visible: getBoolean(body, 'visible'),
      });

      return {
        message: '菜单更新成功',
        data: menu,
      };
    },
  });

  router.register({
    method: 'DELETE',
    path: '/api/menus/:id',
    auth: true,
    permission: 'menu-menu-delete',
    handler: (context) => {
      context.app.services.menuService.delete(withUser(context), context.params.id);
      return {
        message: '菜单删除成功',
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/position-categories',
    auth: true,
    permission: 'menu-position',
    handler: (context) => ({
      data: context.app.services.positionService.listCategories(),
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/position-categories',
    auth: true,
    permission: 'menu-pos-add',
    handler: (context) => {
      const body = asObject(context.body);
      const category = context.app.services.positionService.createCategory(withUser(context), {
        code: getString(body, 'code', { required: true })!,
        name: getString(body, 'name', { required: true })!,
        color: getString(body, 'color', { required: true })!,
        icon: getString(body, 'icon', { required: true })!,
        sortOrder: getNumber(body, 'sortOrder', { required: true, min: 0 })!,
        description: getString(body, 'description', { required: true })!,
      });

      return {
        statusCode: 201,
        message: '岗位分类创建成功',
        data: category,
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/position-categories/:id',
    auth: true,
    permission: 'menu-pos-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const category = context.app.services.positionService.updateCategory(withUser(context), context.params.id, {
        code: getString(body, 'code'),
        name: getString(body, 'name'),
        color: getString(body, 'color'),
        icon: getString(body, 'icon'),
        sortOrder: getNumber(body, 'sortOrder', { min: 0 }),
        description: getString(body, 'description'),
      });

      return {
        message: '岗位分类更新成功',
        data: category,
      };
    },
  });

  router.register({
    method: 'DELETE',
    path: '/api/position-categories/:id',
    auth: true,
    permission: 'menu-pos-delete',
    handler: (context) => {
      context.app.services.positionService.deleteCategory(withUser(context), context.params.id);
      return {
        message: '岗位分类删除成功',
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/positions',
    auth: true,
    permission: 'menu-position',
    handler: (context) => ({
      data: context.app.services.positionService.listPositions(context.query),
    }),
  });

  router.register({
    method: 'POST',
    path: '/api/positions',
    auth: true,
    permission: 'menu-pos-add',
    handler: (context) => {
      const body = asObject(context.body);
      const position = context.app.services.positionService.createPosition(withUser(context), {
        name: getString(body, 'name', { required: true })!,
        code: getString(body, 'code', { required: true })!,
        category: getString(body, 'category', { required: true })!,
        level: getNumber(body, 'level', { required: true, min: 1 })!,
        description: getString(body, 'description', { required: true })!,
        headcount: getNumber(body, 'headcount', { required: true, min: 0 })!,
      });

      return {
        statusCode: 201,
        message: '职位创建成功',
        data: position,
      };
    },
  });

  router.register({
    method: 'PUT',
    path: '/api/positions/:id',
    auth: true,
    permission: 'menu-pos-edit',
    handler: (context) => {
      const body = asObject(context.body);
      const position = context.app.services.positionService.updatePosition(withUser(context), context.params.id, {
        name: getString(body, 'name'),
        code: getString(body, 'code'),
        category: getString(body, 'category'),
        level: getNumber(body, 'level', { min: 1 }),
        description: getString(body, 'description'),
        headcount: getNumber(body, 'headcount', { min: 0 }),
      });

      return {
        message: '职位更新成功',
        data: position,
      };
    },
  });

  router.register({
    method: 'DELETE',
    path: '/api/positions/:id',
    auth: true,
    permission: 'menu-pos-delete',
    handler: (context) => {
      context.app.services.positionService.deletePosition(withUser(context), context.params.id);
      return {
        message: '职位删除成功',
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/grades',
    auth: true,
    permission: 'menu-grade',
    handler: (context) => {
      const { page, pageSize } = getPagination(context.query);
      return {
        data: context.app.services.gradeService.list(page, pageSize),
      };
    },
  });

  router.register({
    method: 'POST',
    path: '/api/grades',
    auth: true,
    permission: 'menu-grade',
    handler: (context) => {
      const body = asObject(context.body);
      const grade = context.app.services.gradeService.create(withUser(context), {
        code: getString(body, 'code', { required: true })!,
        name: getString(body, 'name', { required: true })!,
        level: getNumber(body, 'level', { required: true, min: 1 })!,
        description: getString(body, 'description', { required: true })!,
      });

      return {
        statusCode: 201,
        message: '职级创建成功',
        data: grade,
      };
    },
  });

  router.register({
    method: 'GET',
    path: '/api/audit-logs',
    auth: true,
    permission: 'menu-role',
    handler: (context) => ({
      data: context.app.services.auditService.list(context.query),
    }),
  });
}
