import { menus as frontendMenus } from '../../../src/mocks/data/menus';
import { positionCategories, positions as frontendPositions } from '../../../src/mocks/data/positions';
import { roles as frontendRoles } from '../../../src/mocks/data/roles';
import { users as frontendUsers } from '../../../src/mocks/data/users';
import type {
  AuditLogRecord,
  DepartmentRecord,
  MenuRecord,
  PositionCategoryRecord,
  PositionRecord,
  RoleRecord,
  SeedData,
  UserRecord,
} from '../types';
import { createDepartmentFixtures } from './fixtures/departments';
import { createGradeFixtures } from './fixtures/grades';

const DEFAULT_CREATED_AT = '2026-03-20T08:00:00.000Z';

function buildDepartmentNameMap(departments: DepartmentRecord[]): Map<string, string> {
  const byId = new Map(departments.map((item) => [item.id, item]));
  const cache = new Map<string, string>();

  function resolve(id: string): string {
    const cached = cache.get(id);
    if (cached) return cached;

    const current = byId.get(id);
    if (!current) return id;
    if (!current.parentId) {
      cache.set(id, current.name);
      return current.name;
    }

    const parent = byId.get(current.parentId);
    if (!parent || !parent.parentId) {
      cache.set(id, current.name);
      return current.name;
    }

    const value = `${resolve(parent.id)} · ${current.name}`;
    cache.set(id, value);
    return value;
  }

  for (const department of departments) {
    resolve(department.id);
  }

  return cache;
}

function buildRoles(users: UserRecord[]): RoleRecord[] {
  const baseRoles: RoleRecord[] = frontendRoles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
    dataScope: role.dataScope,
    userCount: users.filter((user) => user.roleIds.includes(role.id)).length,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  }));

  if (!baseRoles.some((role) => role.id === 'role-dean')) {
    baseRoles.splice(1, 0, {
      id: 'role-dean',
      name: '院长',
      description: '学院负责人，负责学院层级管理与资源协调',
      permissions: [
        'menu-dashboard',
        'menu-dept',
        'menu-dept-edit',
        'menu-user',
        'menu-user-add',
        'menu-user-edit',
        'menu-role',
        'menu-grade',
      ],
      dataScope: 'college',
      userCount: users.filter((user) => user.roleIds.includes('role-dean')).length,
      createdAt: DEFAULT_CREATED_AT,
      updatedAt: DEFAULT_CREATED_AT,
    });
  }

  return baseRoles;
}

function buildUsers(departmentNameMap: Map<string, string>): UserRecord[] {
  return frontendUsers.map((user, index) => ({
    ...user,
    departmentName: departmentNameMap.get(user.departmentId) || user.departmentName || user.departmentId,
    roleName: user.roleName || '学生',
    createdAt: new Date(Date.UTC(2026, 0, 1 + index, 8, 0, 0)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 1, 1 + (index % 20), 8, 0, 0)).toISOString(),
  }));
}

function buildMenus(): MenuRecord[] {
  return frontendMenus.map((menu) => ({
    ...menu,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  }));
}

function buildPositionCategories(): PositionCategoryRecord[] {
  return positionCategories.map((category) => ({
    ...category,
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_CREATED_AT,
  }));
}

function buildPositions(): PositionRecord[] {
  return frontendPositions.map((position) => ({
    ...position,
    updatedAt: position.createdAt || DEFAULT_CREATED_AT,
  }));
}

function buildAuditLogs(): AuditLogRecord[] {
  return [
    {
      id: 'audit-bootstrap-001',
      action: '系统初始化',
      operator: 'system',
      target: 'bootstrap',
      type: 'success',
      detail: '已从前端基线数据生成后端初始种子',
      createdAt: DEFAULT_CREATED_AT,
    },
  ];
}

export function createSeedData(): SeedData {
  const departments = createDepartmentFixtures();
  const departmentNameMap = buildDepartmentNameMap(departments);
  const users = buildUsers(departmentNameMap);

  return {
    departments,
    menus: buildMenus(),
    roles: buildRoles(users),
    users,
    positionCategories: buildPositionCategories(),
    positions: buildPositions(),
    grades: createGradeFixtures(),
    auditLogs: buildAuditLogs(),
  };
}
