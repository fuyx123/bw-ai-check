import type { UserInfo } from '../../types/rbac';

/** 用户 mock 数据 */
export const users: UserInfo[] = [
  {
    id: 'user-001',
    name: 'Dr. Elena Rodriguez',
    email: 'elena.rodriguez@seuu.edu',
    initials: 'ER',
    departmentId: 'dept-review',
    departmentName: '学术评审部',
    roleIds: ['role-academic-director'],
    roleName: '教务处长',
    accessStatus: 'full',
  },
  {
    id: 'user-002',
    name: '陈伟',
    email: 'chen.wei@seuu.edu',
    initials: 'CW',
    departmentId: 'dept-outreach',
    departmentName: '全球外联部',
    roleIds: ['role-admin-office'],
    roleName: '行政办公室',
    accessStatus: 'full',
  },
  {
    id: 'user-003',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@seuu.edu',
    initials: 'SJ',
    departmentId: 'dept-ethics',
    departmentName: '机构伦理部',
    roleIds: ['role-major-lead'],
    roleName: '专业负责人',
    accessStatus: 'partial',
  },
  {
    id: 'user-004',
    name: 'Marcus Low',
    email: 'marcus.low@seuu.edu',
    initials: 'ML',
    departmentId: 'dept-editorial',
    departmentName: '编辑委员会',
    roleIds: ['role-lecturer'],
    roleName: '讲师',
    accessStatus: 'inactive',
  },
  // 补充用户以模拟更大数据集
  {
    id: 'user-005',
    name: '张丽华',
    email: 'zhang.lihua@seuu.edu',
    initials: 'ZL',
    departmentId: 'dept-cs',
    departmentName: '计算机科学与技术',
    roleIds: ['role-lecturer'],
    roleName: '讲师',
    accessStatus: 'full',
  },
  {
    id: 'user-006',
    name: '王磊',
    email: 'wang.lei@seuu.edu',
    initials: 'WL',
    departmentId: 'dept-se',
    departmentName: '软件工程',
    roleIds: ['role-major-lead'],
    roleName: '专业负责人',
    accessStatus: 'full',
  },
  {
    id: 'user-007',
    name: 'David Park',
    email: 'david.park@seuu.edu',
    initials: 'DP',
    departmentId: 'dept-ai',
    departmentName: '人工智能研究中心',
    roleIds: ['role-lecturer'],
    roleName: '讲师',
    accessStatus: 'full',
  },
  {
    id: 'user-008',
    name: '李明',
    email: 'li.ming@seuu.edu',
    initials: 'LM',
    departmentId: 'dept-ns',
    departmentName: '网络安全',
    roleIds: ['role-lecturer'],
    roleName: '讲师',
    accessStatus: 'full',
  },
  {
    id: 'user-009',
    name: '赵明远',
    email: 'zhao.mingyuan@seuu.edu',
    initials: 'ZM',
    departmentId: 'dept-root',
    departmentName: '东南联合大学',
    roleIds: ['role-president'],
    roleName: '校长',
    accessStatus: 'full',
  },
  {
    id: 'user-010',
    name: '刘建国',
    email: 'liu.jianguo@seuu.edu',
    initials: 'LJ',
    departmentId: 'dept-ie',
    departmentName: '信息工程学院',
    roleIds: ['role-dean'],
    roleName: '院长',
    accessStatus: 'full',
  },
];

/** 总用户统计 */
export const userStats = {
  total: 48,
  active: 1284,
};

/** 按部门 id 过滤用户 */
export function getUsersByDepartment(departmentId: string): UserInfo[] {
  return users.filter((u) => u.departmentId === departmentId);
}

/** 按角色 id 过滤用户 */
export function getUsersByRole(roleId: string): UserInfo[] {
  return users.filter((u) => u.roleIds.includes(roleId));
}

/** 按 id 查找用户 */
export function findUserById(id: string): UserInfo | undefined {
  return users.find((u) => u.id === id);
}
