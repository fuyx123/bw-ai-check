import type { Role } from '../../types/rbac';
import { getAllMenuIds } from './menus';

export const roles: Role[] = [
  {
    id: 'role-president',
    name: '校长',
    description: '学校最高行政负责人，拥有平台全部权限',
    permissions: getAllMenuIds(),
    dataScope: 'school',
    userCount: 1,
  },
  {
    id: 'role-admin-office',
    name: '行政办公室',
    description: '负责日常行政管理、组织架构维护和人员信息维护',
    permissions: [
      'menu-dashboard',
      'menu-access',
      'menu-dept', 'menu-dept-add', 'menu-dept-edit', 'menu-dept-export',
      'menu-user', 'menu-user-add', 'menu-user-edit',
    ],
    dataScope: 'school',
    userCount: 2,
  },
  {
    id: 'role-academic-director',
    name: '教务处长',
    description: '负责教学运行、阅卷流程与教学周期管理',
    permissions: [
      'menu-dashboard',
      'menu-access',
      'menu-dept',
      'menu-user', 'menu-user-edit',
      'menu-exam', 'menu-exam-upload', 'menu-exam-batch', 'menu-exam-delete',
      'menu-homework-approval',
      'menu-cycle', 'menu-cycle-manage',
    ],
    dataScope: 'school',
    userCount: 1,
  },
  {
    id: 'role-dean',
    name: '院长',
    description: '负责本学院部门与人员管理',
    permissions: [
      'menu-dashboard',
      'menu-access',
      'menu-dept',
      'menu-user', 'menu-user-edit',
      'menu-homework-approval',
    ],
    dataScope: 'college',
    userCount: 4,
  },
  {
    id: 'role-major-lead',
    name: '专业负责人',
    description: '负责本专业教学班级和人员管理',
    permissions: [
      'menu-dashboard',
      'menu-access',
      'menu-dept',
      'menu-user', 'menu-user-edit',
      'menu-exam',
      'menu-homework-approval',
    ],
    dataScope: 'major',
    userCount: 3,
  },
  {
    id: 'role-lecturer',
    name: '讲师',
    description: '负责本班教学与阅卷处理',
    permissions: [
      'menu-dashboard',
      'menu-exam',
      'menu-homework-approval',
    ],
    dataScope: 'class',
    userCount: 3,
  },
  {
    id: 'role-student',
    name: '学生',
    description: '学生账号，仅保留个人基础访问能力',
    permissions: [
      'menu-dashboard',
      'menu-homework-approval',
    ],
    dataScope: 'personal',
    userCount: 7,
  },
];

export function findRoleById(id: string): Role | undefined {
  return roles.find((r) => r.id === id);
}
