import type { GradeRecord } from '../../types';

export function createGradeFixtures(): GradeRecord[] {
  const now = '2026-03-20T08:00:00.000Z';
  return [
    { id: 'grade-001', code: 'G1', name: '一级', level: 1, description: '最低等级', createdAt: now, updatedAt: now },
    { id: 'grade-002', code: 'G2', name: '二级', level: 2, description: '基础等级', createdAt: now, updatedAt: now },
    { id: 'grade-003', code: 'G3', name: '三级', level: 3, description: '初级等级', createdAt: now, updatedAt: now },
    { id: 'grade-004', code: 'G4', name: '四级', level: 4, description: '中级等级', createdAt: now, updatedAt: now },
    { id: 'grade-005', code: 'G5', name: '五级', level: 5, description: '高级等级', createdAt: now, updatedAt: now },
    { id: 'grade-006', code: 'G6', name: '六级', level: 6, description: '专家等级', createdAt: now, updatedAt: now },
  ];
}
