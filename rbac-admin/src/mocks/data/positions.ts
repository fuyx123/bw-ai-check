import type { Position, PositionCategory } from '../../types/rbac';

/** 岗位类别 */
export const positionCategories: PositionCategory[] = [
  {
    id: 'cat-management',
    code: 'management',
    name: '管理类',
    color: '#f5222d',
    icon: 'CrownOutlined',
    sortOrder: 1,
    description: '学校行政管理岗位',
  },
  {
    id: 'cat-academic',
    code: 'academic',
    name: '教务类',
    color: '#fa8c16',
    icon: 'FileTextOutlined',
    sortOrder: 2,
    description: '负责学生成绩及教学事务的岗位',
  },
  {
    id: 'cat-teaching',
    code: 'teaching',
    name: '教学类',
    color: '#1677ff',
    icon: 'SolutionOutlined',
    sortOrder: 3,
    description: '承担阶段教学管理工作的岗位',
  },
];

export const categoryLabels: Record<string, string> = Object.fromEntries(
  positionCategories.map((c) => [c.code, c.name]),
);
export const categoryColors: Record<string, string> = Object.fromEntries(
  positionCategories.map((c) => [c.code, c.color]),
);

/** 岗位列表 */
export const positions: Position[] = [
  // ===== 管理类 =====
  {
    id: 'pos-president',
    name: '校长',
    code: 'PRESIDENT',
    category: 'management',
    level: 1,
    description: '学校最高行政负责人，统筹全校教学与行政工作',
    headcount: 1,
    createdAt: '2022-01-01',
  },

  // ===== 教务类 =====
  {
    id: 'pos-affairs-director',
    name: '教务主任',
    code: 'AFFAIRS-DIR',
    category: 'academic',
    level: 1,
    description: '教务部门负责人，统筹全校成绩管理与教学事务',
    headcount: 1,
    createdAt: '2022-01-01',
  },
  {
    id: 'pos-affairs-staff',
    name: '教务员',
    code: 'AFFAIRS-STAFF',
    category: 'academic',
    level: 2,
    description: '负责日常成绩录入、查询及教学数据维护',
    headcount: 12,
    createdAt: '2022-01-01',
  },

  // ===== 教学类 =====
  {
    id: 'pos-pro-director',
    name: '专业主任',
    code: 'PRO-DIR',
    category: 'teaching',
    level: 1,
    description: '负责所在学院专业阶段（专业一至专业五）的日常教学管理',
    headcount: 6,
    createdAt: '2022-01-01',
  },
  {
    id: 'pos-adv-director',
    name: '专高主任',
    code: 'ADV-DIR',
    category: 'teaching',
    level: 1,
    description: '负责所在学院专业高级阶段（专高一至专高六）的日常教学管理',
    headcount: 6,
    createdAt: '2022-01-01',
  },
  {
    id: 'pos-lecturer',
    name: '讲师',
    code: 'LECTURER',
    category: 'teaching',
    level: 2,
    description: '各班级专属讲师，承担本班日常教学任务，管理本班学生成绩',
    headcount: 66,
    createdAt: '2022-01-01',
  },
];
