import type { Department } from '../../types/rbac';

/**
 * 组织层级:
 * university  → 学校
 * college     → 学院（全栈开发、云计算、传媒、游戏、鸿蒙、大数据）
 * major       → 阶段（专业阶段 / 专业高级阶段）
 * class       → 班级（专业一~专业五 / 专高一~专高六）
 */

// ---- 通用班级生成函数 ----
function makeProClasses(parentId: string, collegeCode: string): Department[] {
  return [1, 2, 3, 4, 5].map((n) => ({
    id: `${parentId}-${n}`,
    name: `专业${['一', '二', '三', '四', '五'][n - 1]}`,
    code: `${collegeCode}-PRO-${n}`,
    parentId,
    level: 'class' as const,
    leader: { name: '', title: '班主任' },
    staffCount: 40,
    status: 'operational' as const,
    updatedAt: '2024-09-01',
  }));
}

function makeAdvClasses(parentId: string, collegeCode: string): Department[] {
  return [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `${parentId}-${n}`,
    name: `专高${['一', '二', '三', '四', '五', '六'][n - 1]}`,
    code: `${collegeCode}-ADV-${n}`,
    parentId,
    level: 'class' as const,
    leader: { name: '', title: '班主任' },
    staffCount: 40,
    status: 'operational' as const,
    updatedAt: '2024-09-01',
  }));
}

// ---- 单个学院构建函数 ----
function makeCollege(
  id: string,
  name: string,
  code: string,
  proDirector: string,
  advDirector: string,
): Department {
  const proId = `${id}-pro`;
  const advId = `${id}-adv`;
  return {
    id,
    name,
    code,
    parentId: 'dept-root',
    level: 'college',
    leader: { name: '', title: '院长' },
    staffCount: 440,
    status: 'operational',
    updatedAt: '2024-09-01',
    children: [
      {
        id: proId,
        name: '专业阶段',
        code: `${code}-PRO`,
        parentId: id,
        level: 'major',
        leader: { name: proDirector, title: '专业主任' },
        staffCount: 200,
        status: 'operational',
        updatedAt: '2024-09-01',
        children: makeProClasses(proId, code),
      },
      {
        id: advId,
        name: '专业高级阶段',
        code: `${code}-ADV`,
        parentId: id,
        level: 'major',
        leader: { name: advDirector, title: '专高主任' },
        staffCount: 240,
        status: 'operational',
        updatedAt: '2024-09-01',
        children: makeAdvClasses(advId, code),
      },
    ],
  };
}

/** 完整部门树 */
export const departments: Department[] = [
  {
    id: 'dept-root',
    name: '巴威职业技术学院',
    code: 'BWVTC',
    parentId: null,
    level: 'university',
    leader: { name: '王校长', title: '校长' },
    staffCount: 3200,
    status: 'operational',
    updatedAt: '2024-09-01',
    children: [
      // ---- 教务部门 ----
      {
        id: 'dept-affairs',
        name: '教务部门',
        code: 'AFFAIRS',
        parentId: 'dept-root',
        level: 'university',
        leader: { name: '李教务', title: '教务主任' },
        staffCount: 8,
        status: 'operational',
        updatedAt: '2024-09-01',
      },
      // ---- 6 个学院 ----
      makeCollege('dept-fs',  '全栈开发学院', 'FS',  '张专主',  '陈专高'),
      makeCollege('dept-cc',  '云计算学院',   'CC',  '刘专主',  '赵专高'),
      makeCollege('dept-mc',  '传媒学院',     'MC',  '孙专主',  '周专高'),
      makeCollege('dept-gd',  '游戏学院',     'GD',  '吴专主',  '郑专高'),
      makeCollege('dept-hm',  '鸿蒙学院',     'HM',  '冯专主',  '韩专高'),
      makeCollege('dept-bd',  '大数据学院',   'BD',  '秦专主',  '许专高'),
    ],
  },
];

/** 递归扁平化 */
export function flattenDepartments(
  tree: Department[] = departments,
): Department[] {
  const result: Department[] = [];
  for (const node of tree) {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenDepartments(node.children));
    }
  }
  return result;
}

/** 按 id 查找部门 */
export function findDepartmentById(
  id: string,
  tree: Department[] = departments,
): Department | undefined {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findDepartmentById(id, node.children);
      if (found) return found;
    }
  }
  return undefined;
}

export const departmentTree = departments;
export const flatDepartmentList = flattenDepartments(departments);
