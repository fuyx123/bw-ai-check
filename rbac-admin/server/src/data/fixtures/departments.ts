import { departments as frontendDepartments } from '../../../../src/mocks/data/departments';
import type { DepartmentRecord } from '../../types';

const DEFAULT_TIMESTAMP = '2026-03-20T08:00:00.000Z';

function toDepartmentRecord(input: (typeof frontendDepartments)[number]): DepartmentRecord {
  return {
    id: input.id,
    name: input.name,
    code: input.code,
    parentId: input.parentId,
    level: input.level,
    leader: input.leader,
    leaderName: input.leader.name,
    leaderTitle: input.leader.title,
    staffCount: input.staffCount,
    status: input.status,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
  };
}

function flattenDepartments(items: typeof frontendDepartments): DepartmentRecord[] {
  const records: DepartmentRecord[] = [];

  const walk = (nodes: typeof frontendDepartments) => {
    for (const node of nodes) {
      records.push(toDepartmentRecord(node));
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(items);
  return records;
}

export function createDepartmentFixtures(): DepartmentRecord[] {
  return flattenDepartments(frontendDepartments);
}
