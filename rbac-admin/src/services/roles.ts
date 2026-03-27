import { http, unwrap } from './http';
import type { DataScope, Role } from '../types/rbac';

interface BackendRole extends Omit<Role, 'permissions'> {
  permissions?: string[];
}

function mapRole(role: BackendRole): Role {
  return {
    ...role,
    permissions: role.permissions || [],
  };
}

export async function fetchRoles() {
  const response = await http.get('/iam/roles');
  return unwrap<BackendRole[]>(response.data).map(mapRole);
}

export async function createRole(payload: {
  name: string;
  description: string;
  dataScope: DataScope;
}) {
  const response = await http.post('/iam/roles', payload);
  return mapRole(unwrap<BackendRole>(response.data));
}

export async function updateRole(id: string, payload: Partial<{
  name: string;
  description: string;
  dataScope: DataScope;
}>) {
  const response = await http.put(`/iam/roles/${id}`, payload);
  return mapRole(unwrap<BackendRole>(response.data));
}

export async function updateRoleMenus(id: string, menuIds: string[]) {
  const response = await http.put(`/iam/roles/${id}/menus`, { menuIds });
  return mapRole(unwrap<BackendRole>(response.data));
}

export async function deleteRole(id: string) {
  await http.delete(`/iam/roles/${id}`);
}
