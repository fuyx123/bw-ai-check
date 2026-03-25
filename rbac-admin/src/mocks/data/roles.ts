import type { Role } from '../../types/rbac';
import { getAllMenuIds } from './menus';

export const roles: Role[] = [
  {
    id: 'role-president',
    name: '校长',
    description: '学校最高行政负责人，拥有全部权限',
    permissions: getAllMenuIds(), // all menus
    dataScope: 'school',
    userCount: 1,
  },
  {
    id: 'role-admin-office',
    name: '行政办公室',
    description: '负责日常行政管理和综合协调',
    permissions: [
      'menu-dashboard', 'menu-dept', 'menu-dept-add', 'menu-dept-edit', 'menu-dept-export',
      'menu-user', 'menu-user-add', 'menu-user-edit',
      'menu-position', 'menu-pos-add', 'menu-pos-edit',
    ],
    dataScope: 'school',
    userCount: 12,
  },
  {
    id: 'role-academic-director',
    name: '教务处长',
    description: '负责教务管理、课程审批和学术质量监控',
    permissions: [
      'menu-dashboard', 'menu-dept',
      'menu-user', 'menu-user-edit',
      'menu-grade', 'menu-position',
    ],
    dataScope: 'school',
    userCount: 4,
  },
  {
    id: 'role-dean',
    name: '院长',
    description: '学院负责人，管理学院事务',
    permissions: [
      'menu-dashboard', 'menu-dept', 'menu-dept-edit',
      'menu-user', 'menu-user-add', 'menu-user-edit',
      'menu-grade', 'menu-position',
    ],
    dataScope: 'college',
    userCount: 8,
  },
  {
    id: 'role-major-lead',
    name: '专业负责人',
    description: '专业方向负责人，管理专业课程和师资',
    permissions: ['menu-dashboard', 'menu-grade', 'menu-user'],
    dataScope: 'major',
    userCount: 15,
  },
  {
    id: 'role-lecturer',
    name: '讲师',
    description: '承担教学任务的教师',
    permissions: ['menu-dashboard', 'menu-grade'],
    dataScope: 'class',
    userCount: 142,
  },
];

export function findRoleById(id: string): Role | undefined {
  return roles.find(r => r.id === id);
}
