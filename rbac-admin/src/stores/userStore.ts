import { create } from 'zustand';
import type { UserInfo, UserType } from '../types/rbac';
import {
  createUser as createUserRequest,
  deleteUser as deleteUserRequest,
  fetchUsers as fetchUsersRequest,
  toggleUserStatus as toggleUserStatusRequest,
  updateUser as updateUserRequest,
} from '../services/users';

interface UserFilters {
  departmentId?: string;
  roleId?: string;
  keyword?: string;
  userType?: UserType;
}

interface Pagination {
  current: number;
  pageSize: number;
  total: number;
}

interface UserState {
  users: UserInfo[];
  filteredUsers: UserInfo[];
  filters: UserFilters;
  pagination: Pagination;
  totalActive: number;
  loading: boolean;
  fetchUsers: () => Promise<void>;
  setFilter: (filters: Partial<UserFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  setPagination: (page: number, pageSize?: number) => void;
  addUser: (userData: Partial<UserInfo>) => Promise<void>;
  updateUser: (id: string, updates: Partial<UserInfo>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

function filterUsers(allUsers: UserInfo[], filters: UserFilters): UserInfo[] {
  let result = [...allUsers];

  if (filters.userType) {
    result = result.filter((user) => user.userType === filters.userType);
  }
  if (filters.departmentId) {
    result = result.filter((user) => user.departmentId === filters.departmentId);
  }
  if (filters.roleId) {
    result = result.filter((user) => user.roleIds.includes(filters.roleId!));
  }
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    result = result.filter(
      (user) =>
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword) ||
        user.loginId.toLowerCase().includes(keyword),
    );
  }

  return result;
}

function buildUserState(users: UserInfo[], filters: UserFilters, pagination: Pagination, totalActive: number) {
  const filteredUsers = filterUsers(users, filters);
  return {
    users,
    filteredUsers,
    filters,
    pagination: {
      ...pagination,
      total: filteredUsers.length,
      current: 1,
    },
    totalActive,
  };
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  filteredUsers: [],
  filters: {},
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
  },
  totalActive: 0,
  loading: false,

  fetchUsers: async () => {
    set({ loading: true });
    const result = await fetchUsersRequest(1, 500);
    set({
      ...buildUserState(result.items, get().filters, get().pagination, result.totalActive),
      loading: false,
    });
  },

  setFilter: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    set({
      filters,
      filteredUsers: filterUsers(get().users, filters),
      pagination: {
        ...get().pagination,
        total: filterUsers(get().users, filters).length,
        current: 1,
      },
    });
  },

  clearFilters: () => {
    set({
      filters: {},
      filteredUsers: get().users,
      pagination: { ...get().pagination, total: get().users.length, current: 1 },
    });
  },

  applyFilters: () => {
    const filteredUsers = filterUsers(get().users, get().filters);
    set({
      filteredUsers,
      pagination: { ...get().pagination, total: filteredUsers.length, current: 1 },
    });
  },

  setPagination: (page, pageSize) => {
    set({
      pagination: {
        ...get().pagination,
        current: page,
        pageSize: pageSize ?? get().pagination.pageSize,
      },
    });
  },

  addUser: async (userData) => {
    await createUserRequest({
      name: userData.name || '',
      email: userData.email || '',
      loginId: userData.loginId || '',
      password: '123456',
      userType: userData.userType || 'staff',
      departmentId: userData.departmentId || '',
      roleIds: userData.roleIds || [],
      accessStatus: userData.accessStatus || 'full',
      isActive: userData.isActive ?? true,
      avatar: userData.avatar,
      grade: userData.grade,
      className: userData.className,
      classId: userData.classId,
    });
    await get().fetchUsers();
  },

  updateUser: async (id, updates) => {
    if (typeof updates.isActive === 'boolean' && Object.keys(updates).length === 1) {
      await toggleUserStatusRequest(id, updates.isActive);
    } else {
      await updateUserRequest(id, {
        name: updates.name,
        email: updates.email,
        departmentId: updates.departmentId,
        roleIds: updates.roleIds,
        accessStatus: updates.accessStatus,
        isActive: updates.isActive,
        avatar: updates.avatar,
        grade: updates.grade,
        className: updates.className,
        classId: updates.classId,
      });
    }
    await get().fetchUsers();
  },

  deleteUser: async (id) => {
    await deleteUserRequest(id);
    await get().fetchUsers();
  },
}));
