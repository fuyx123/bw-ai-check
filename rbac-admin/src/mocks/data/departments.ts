import type { Department } from '../../types/rbac';

/**
 * 组织层级（5层）:
 * university  → 学校
 * college     → 学院（全栈开发、云计算、传媒、游戏、鸿蒙、大数据）
 * stage       → 阶段（专业阶段 / 专业高级阶段）
 * major       → 专业（专业一、专业二、...）
 * class       → 班级（2401A、2310A、...）
 */

// ---- 班级生成函数 ----
function makeClasses(majorId: string, majorName: string, majorCode: string): Department[] {
  const classMap: Record<string, string[]> = {
    '专业一': ['2401A', '2402A', '2403A'],
    '专业二': ['2310A', '2311A', '2312A'],
    '专业三': ['2220A', '2221A', '2222A'],
    '专业四': ['2130A', '2131A'],
    '专业五': ['2040A', '2041A'],
    '专高一': ['2401B', '2402B'],
    '专高二': ['2310B', '2311B'],
    '专高三': ['2220B', '2221B'],
    '专高四': ['2130B', '2131B'],
    '专高五': ['2040B', '2041B'],
    '专高六': ['2405B', '2406B'],
  };

  const classes = classMap[majorName] || [];
  return classes.map((className, idx) => ({
    id: `${majorId}-${idx + 1}`,
    name: className,
    code: `${majorCode}-${className}`,
    parentId: majorId,
    level: 'class' as const,
    leader: { name: '', title: '班主任' },
    staffCount: 35,
    status: 'operational' as const,
    updatedAt: '2024-09-01',
  }));
}

// ---- 专业生成函数（专业阶段用） ----
function makeProMajors(stageId: string, collegeCode: string): Department[] {
  const majors = ['一', '二', '三', '四', '五'];
  return majors.map((num, idx) => {
    const majorId = `${stageId}-major-${idx + 1}`;
    return {
      id: majorId,
      name: `专业${num}`,
      code: `${collegeCode}-PRO-${idx + 1}`,
      parentId: stageId,
      level: 'major' as const,
      leader: { name: '', title: '专业负责人' },
      staffCount: 120,
      status: 'operational' as const,
      updatedAt: '2024-09-01',
      children: makeClasses(majorId, `专业${num}`, `${collegeCode}-PRO-${idx + 1}`),
    };
  });
}

// ---- 高级阶段专业生成函数 ----
function makeAdvMajors(stageId: string, collegeCode: string): Department[] {
  const majors = ['一', '二', '三', '四', '五', '六'];
  return majors.map((num, idx) => {
    const majorId = `${stageId}-major-${idx + 1}`;
    return {
      id: majorId,
      name: `专高${num}`,
      code: `${collegeCode}-ADV-${idx + 1}`,
      parentId: stageId,
      level: 'major' as const,
      leader: { name: '', title: '专业负责人' },
      staffCount: 120,
      status: 'operational' as const,
      updatedAt: '2024-09-01',
      children: makeClasses(majorId, `专高${num}`, `${collegeCode}-ADV-${idx + 1}`),
    };
  });
}

// ---- 单个学院构建函数 ----
function makeCollege(
  id: string,
  name: string,
  code: string,
): Department {
  const proStageId = `${id}-pro-stage`;
  const advStageId = `${id}-adv-stage`;

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
        id: proStageId,
        name: '专业阶段',
        code: `${code}-PRO-STAGE`,
        parentId: id,
        level: 'stage',
        leader: { name: '', title: '专业主任' },
        staffCount: 200,
        status: 'operational',
        updatedAt: '2024-09-01',
        children: makeProMajors(proStageId, code),
      },
      {
        id: advStageId,
        name: '专业高级阶段',
        code: `${code}-ADV-STAGE`,
        parentId: id,
        level: 'stage',
        leader: { name: '', title: '专高主任' },
        staffCount: 240,
        status: 'operational',
        updatedAt: '2024-09-01',
        children: makeAdvMajors(advStageId, code),
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
        level: 'college',
        leader: { name: '李教务', title: '教务主任' },
        staffCount: 8,
        status: 'operational',
        updatedAt: '2024-09-01',
      },
      // ---- 6 个学院 ----
      makeCollege('dept-fs', '全栈开发学院', 'FS'),
      makeCollege('dept-cc', '云计算学院', 'CC'),
      makeCollege('dept-mc', '传媒学院', 'MC'),
      makeCollege('dept-gd', '游戏学院', 'GD'),
      makeCollege('dept-hm', '鸿蒙学院', 'HM'),
      makeCollege('dept-bd', '大数据学院', 'BD'),
    ],
  },
];

// ---- 按 ID 查找部门 ----
export function findDepartmentById(id: string, depts: Department[] = departments): Department | null {
  for (const dept of depts) {
    if (dept.id === id) return dept;
    if (dept.children) {
      const found = findDepartmentById(id, dept.children);
      if (found) return found;
    }
  }
  return null;
}

// ---- 扁平化部门列表（用于下拉选择，含缓存优化） ----
export const flattenDepartments = (() => {
  let cached: Department[] | null = null;
  return (depts: Department[] = departments): Department[] => {
    if (!cached) {
      cached = [];
      const flatten = (items: Department[]) => {
        for (const item of items) {
          cached!.push(item);
          if (item.children?.length) {
            flatten(item.children);
          }
        }
      };
      flatten(depts);
    }
    return cached;
  };
})();
