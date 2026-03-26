import type { Role } from '../../types/rbac';
import { getAllMenuIds } from './menus';

/**
 * 角色设计：
 * - 校长：全部权限，数据范围 school
 * - 专业主任：管理所在学院专业阶段（专业一~专业五），数据范围 major
 * - 专高主任：管理所在学院专业高级阶段（专高一~专高六），数据范围 major
 * - 教务：可查看全校成绩，数据范围 school（成绩只读）
 * - 讲师：负责所在班级的教学，仅可查看本班成绩，数据范围 class
 * - 学生：仅工作台/成绩查看，数据范围 class（由 userType='student' 单独处理）
 */
export const roles: Role[] = [
  {
    id: 'role-president',
    name: '校长',
    description: '学校最高行政负责人，拥有全部权限，可查看所有学院数据',
    permissions: getAllMenuIds(),
    dataScope: 'school',
    userCount: 1,
  },
  {
    id: 'role-pro-director',
    name: '专业主任',
    description: '负责所在学院专业阶段（专业一~专业五）的教学管理工作',
    permissions: [
      'menu-dashboard',
      'menu-dept', 'menu-dept-edit',
      'menu-user', 'menu-user-add', 'menu-user-edit',
      'menu-grade',
    ],
    dataScope: 'major',
    userCount: 6,
  },
  {
    id: 'role-adv-director',
    name: '专高主任',
    description: '负责所在学院专业高级阶段（专高一~专高六）的教学管理工作',
    permissions: [
      'menu-dashboard',
      'menu-dept', 'menu-dept-edit',
      'menu-user', 'menu-user-add', 'menu-user-edit',
      'menu-grade',
    ],
    dataScope: 'major',
    userCount: 6,
  },
  {
    id: 'role-academic-affairs',
    name: '教务',
    description: '教务部门人员，负责全校学生成绩管理，拥有所有学院成绩的查看权限',
    permissions: [
      'menu-dashboard',
      'menu-grade',
      'menu-user',
    ],
    dataScope: 'school',
    userCount: 8,
  },
  {
    id: 'role-lecturer',
    name: '讲师',
    description: '各班级专属讲师，负责本班教学工作，仅可查看本班学生成绩',
    permissions: [
      'menu-dashboard',
      'menu-grade',
    ],
    dataScope: 'class',
    userCount: 66,
  },
];

export function findRoleById(id: string): Role | undefined {
  return roles.find((r) => r.id === id);
}
