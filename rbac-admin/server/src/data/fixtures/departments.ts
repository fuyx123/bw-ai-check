import type { DepartmentRecord } from '../../types';

interface CollegeFixture {
  id: string;
  name: string;
  code: string;
}

const colleges: CollegeFixture[] = [
  { id: 'dept-fs', name: '全栈开发学院', code: 'FS' },
  { id: 'dept-cc', name: '云计算学院', code: 'CC' },
  { id: 'dept-mc', name: '传媒学院', code: 'MC' },
  { id: 'dept-gd', name: '游戏学院', code: 'GD' },
  { id: 'dept-hm', name: '鸿蒙学院', code: 'HM' },
  { id: 'dept-bd', name: '大数据学院', code: 'BD' },
];

function createDepartment(
  input: Omit<DepartmentRecord, 'leaderName' | 'leaderTitle'>,
): DepartmentRecord {
  return {
    ...input,
    leaderName: input.leader.name,
    leaderTitle: input.leader.title,
  };
}

function createStageChildren(collegeId: string, collegeCode: string, type: 'pro' | 'adv'): DepartmentRecord[] {
  const size = type === 'pro' ? 5 : 6;
  const labelPrefix = type === 'pro' ? '专业' : '专高';
  const now = '2026-03-20T08:00:00.000Z';
  const stageId = `${collegeId}-${type}`;

  return Array.from({ length: size }, (_, index) =>
    createDepartment({
      id: `${stageId}-${index + 1}`,
      name: `${labelPrefix}${['一', '二', '三', '四', '五', '六'][index]}`,
      code: `${collegeCode}-${type.toUpperCase()}-${index + 1}`,
      parentId: stageId,
      level: 'class',
      leader: { name: '', title: '班主任' },
      staffCount: 35,
      status: 'operational',
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export function createDepartmentFixtures(): DepartmentRecord[] {
  const now = '2026-03-20T08:00:00.000Z';
  const records: DepartmentRecord[] = [
    createDepartment({
      id: 'dept-root',
      name: '巴威职业技术学院',
      code: 'BWVTC',
      parentId: null,
      level: 'university',
      leader: { name: '王校长', title: '校长' },
      staffCount: 3200,
      status: 'operational',
      createdAt: now,
      updatedAt: now,
    }),
    createDepartment({
      id: 'dept-affairs',
      name: '教务部门',
      code: 'AFFAIRS',
      parentId: 'dept-root',
      level: 'college',
      leader: { name: '李教务', title: '教务主任' },
      staffCount: 8,
      status: 'operational',
      createdAt: now,
      updatedAt: now,
    }),
  ];

  for (const college of colleges) {
    records.push(
      createDepartment({
        id: college.id,
        name: college.name,
        code: college.code,
        parentId: 'dept-root',
        level: 'college',
        leader: { name: '', title: '院长' },
        staffCount: 440,
        status: 'operational',
        createdAt: now,
        updatedAt: now,
      }),
    );

    records.push(
      createDepartment({
        id: `${college.id}-pro`,
        name: '专业阶段',
        code: `${college.code}-PRO`,
        parentId: college.id,
        level: 'stage',
        leader: { name: '', title: '专业主任' },
        staffCount: 220,
        status: 'operational',
        createdAt: now,
        updatedAt: now,
      }),
    );
    records.push(
      createDepartment({
        id: `${college.id}-adv`,
        name: '专业高级阶段',
        code: `${college.code}-ADV`,
        parentId: college.id,
        level: 'stage',
        leader: { name: '', title: '专高主任' },
        staffCount: 240,
        status: 'operational',
        createdAt: now,
        updatedAt: now,
      }),
    );

    records.push(...createStageChildren(college.id, college.code, 'pro'));
    records.push(...createStageChildren(college.id, college.code, 'adv'));
  }

  return records;
}
