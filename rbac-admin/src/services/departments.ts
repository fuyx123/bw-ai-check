import { http, unwrap } from './http';
import type { Department, DepartmentLevel } from '../types/rbac';

interface BackendDepartment extends Omit<Department, 'leader'> {
  leader?: Department['leader'];
  leaderName?: string;
  leaderTitle?: string;
  leaderAvatar?: string;
}

function mapDepartment(dept: BackendDepartment): Department {
  return {
    ...dept,
    parentId: dept.parentId ?? null,
    leader: dept.leader || {
      name: dept.leaderName || '',
      title: dept.leaderTitle || '',
      avatar: dept.leaderAvatar,
    },
    updatedAt: dept.updatedAt?.split('T')[0] || dept.updatedAt,
    children: dept.children?.map((child) => mapDepartment(child as BackendDepartment)),
  };
}

export async function fetchDepartmentTree() {
  const response = await http.get('/org/departments/tree');
  const data = unwrap<BackendDepartment[]>(response.data);
  return data.map(mapDepartment);
}

export async function createDepartment(payload: {
  name: string;
  code: string;
  parentId: string | null;
  level: DepartmentLevel;
  leaderName: string;
  leaderTitle: string;
  staffCount: number;
}) {
  const response = await http.post('/org/departments', payload);
  return mapDepartment(unwrap<BackendDepartment>(response.data));
}

export async function updateDepartment(id: string, payload: Partial<{
  name: string;
  code: string;
  level: DepartmentLevel;
  leaderName: string;
  leaderTitle: string;
  staffCount: number;
}>) {
  const response = await http.put(`/org/departments/${id}`, payload);
  return mapDepartment(unwrap<BackendDepartment>(response.data));
}

export async function deleteDepartment(id: string) {
  await http.delete(`/org/departments/${id}`);
}
