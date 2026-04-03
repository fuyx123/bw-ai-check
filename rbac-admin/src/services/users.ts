import { http, unwrap } from './http';
import type { UserInfo, UserType } from '../types/rbac';

interface BackendUser extends UserInfo {}

function mapUser(user: BackendUser): UserInfo {
  return {
    ...user,
    avatar: user.avatar || undefined,
    createdAt: user.createdAt?.split('T')[0] || user.createdAt,
    updatedAt: user.updatedAt?.split('T')[0] || user.updatedAt,
  };
}

export async function fetchUsers(page = 1, pageSize = 200, filters?: {
  departmentId?: string;
  roleId?: string;
  keyword?: string;
  userType?: UserType;
}) {
  const response = await http.get('/iam/users', {
    params: {
      page,
      pageSize,
      ...filters,
    },
  });

  const payload = response.data as {
    data: {
      items: BackendUser[];
      total: number;
      page: number;
      pageSize: number;
    };
    totalActive?: number;
  };

  return {
    items: payload.data.items.map(mapUser),
    total: payload.data.total,
    page: payload.data.page,
    pageSize: payload.data.pageSize,
    totalActive: payload.totalActive ?? payload.data.items.filter((item) => item.accessStatus !== 'inactive').length,
  };
}

export async function createUser(payload: {
  name: string;
  email: string;
  loginId: string;
  password: string;
  userType: UserType;
  departmentId: string;
  roleIds: string[];
  accessStatus: UserInfo['accessStatus'];
  isActive: boolean;
  avatar?: string;
  grade?: string;
  className?: string;
  classId?: string;
}) {
  const response = await http.post('/iam/users', payload);
  return mapUser(unwrap<BackendUser>(response.data));
}

export async function updateUser(id: string, payload: Partial<{
  name: string;
  email: string;
  departmentId: string;
  roleIds: string[];
  accessStatus: UserInfo['accessStatus'];
  isActive: boolean;
  avatar?: string;
  grade?: string;
  className?: string;
  classId?: string;
}>) {
  const response = await http.put(`/iam/users/${id}`, payload);
  return mapUser(unwrap<BackendUser>(response.data));
}

export async function deleteUser(id: string) {
  await http.delete(`/iam/users/${id}`);
}

export async function toggleUserStatus(id: string, isActive: boolean) {
  const response = await http.patch(`/iam/users/${id}/status`, { isActive });
  return mapUser(unwrap<BackendUser>(response.data));
}

export async function resetUserPassword(id: string, newPassword: string) {
  await http.patch(`/iam/users/${id}/reset-password`, { newPassword });
}
