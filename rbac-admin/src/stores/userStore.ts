import { create } from 'zustand';
import type { UserInfo, UserType } from '../types/rbac';
import { users } from '../mocks/data/users';

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
  fetchUsers: () => void;
  setFilter: (filters: Partial<UserFilters>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  setPagination: (page: number, pageSize?: number) => void;
  addUser: (userData: Partial<UserInfo>) => void;
  updateUser: (id: string, updates: Partial<UserInfo>) => void;
  deleteUser: (id: string) => void;
}

function filterUsers(allUsers: UserInfo[], filters: UserFilters): UserInfo[] {
  let result = [...allUsers];

  if (filters.userType) {
    result = result.filter((u) => u.userType === filters.userType);
  }
  if (filters.departmentId) {
    result = result.filter((u) => u.departmentId === filters.departmentId);
  }
  if (filters.roleId) {
    result = result.filter((u) => u.roleIds.includes(filters.roleId!));
  }
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(kw) ||
        u.email.toLowerCase().includes(kw) ||
        u.loginId.toLowerCase().includes(kw),
    );
  }

  return result;
}

// 确保所有用户都有 isActive 字段
const usersWithDefaults = users.map((u) => ({
  ...u,
  isActive: u.isActive ?? true,
  createdAt: u.createdAt || new Date().toISOString(),
  updatedAt: u.updatedAt || new Date().toISOString(),
}));

export const useUserStore = create<UserState>((set, get) => ({
  users: usersWithDefaults,
  filteredUsers: usersWithDefaults,
  filters: {},
  pagination: {
    current: 1,
    pageSize: 10,
    total: usersWithDefaults.length,
  },
  totalActive: usersWithDefaults.filter((u) => u.accessStatus !== 'inactive').length,
  loading: false,

  fetchUsers: () => {
    set({ loading: true });
    setTimeout(() => {
      const currentUsers = get().users;
      const filtered = filterUsers(currentUsers, get().filters);
      set({
        filteredUsers: filtered,
        pagination: { ...get().pagination, total: filtered.length, current: 1 },
        totalActive: currentUsers.filter((u) => u.accessStatus !== 'inactive').length,
        loading: false,
      });
    }, 300);
  },

  setFilter: (newFilters: Partial<UserFilters>) => {
    const currentUsers = get().users;
    const merged = { ...get().filters, ...newFilters };
    const filtered = filterUsers(currentUsers, merged);
    set({
      filters: merged,
      filteredUsers: filtered,
      pagination: { ...get().pagination, total: filtered.length, current: 1 },
    });
  },

  clearFilters: () => {
    const currentUsers = get().users;
    set({
      filters: {},
      filteredUsers: currentUsers,
      pagination: { ...get().pagination, total: currentUsers.length, current: 1 },
    });
  },

  applyFilters: () => {
    const currentUsers = get().users;
    const filtered = filterUsers(currentUsers, get().filters);
    set({
      filteredUsers: filtered,
      pagination: { ...get().pagination, total: filtered.length, current: 1 },
    });
  },

  setPagination: (page: number, pageSize?: number) => {
    const prev = get().pagination;
    set({
      pagination: {
        ...prev,
        current: page,
        pageSize: pageSize ?? prev.pageSize,
      },
    });
  },

  addUser: (userData: Partial<UserInfo>) => {
    // 生成新 ID（简单实现）
    const newId = `user-${Date.now()}`;
    const now = new Date().toISOString();

    const newUser: UserInfo = {
      id: newId,
      name: userData.name || '',
      email: userData.email || '',
      avatar: userData.avatar,
      initials: userData.initials,
      departmentId: userData.departmentId || '',
      departmentName: userData.departmentName || '',
      roleIds: userData.roleIds || [],
      roleName: userData.roleName || '',
      accessStatus: userData.accessStatus || 'full',
      userType: userData.userType || 'staff',
      loginId: userData.loginId || '',
      grade: userData.grade,
      className: userData.className,
      classId: userData.classId,
      isActive: userData.isActive ?? true,
      createdAt: userData.createdAt || now,
      updatedAt: userData.updatedAt || now,
    } as UserInfo;

    const updatedUsers = [...get().users, newUser];
    const filtered = filterUsers(updatedUsers, get().filters);

    set({
      users: updatedUsers,
      filteredUsers: filtered,
      pagination: { ...get().pagination, total: filtered.length },
      totalActive: updatedUsers.filter((u) => u.accessStatus !== 'inactive').length,
    });
  },

  updateUser: (id: string, updates: Partial<UserInfo>) => {
    const updatedUsers = get().users.map((user) =>
      user.id === id
        ? {
            ...user,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : user,
    );

    const filtered = filterUsers(updatedUsers, get().filters);

    set({
      users: updatedUsers,
      filteredUsers: filtered,
      pagination: { ...get().pagination, total: filtered.length },
      totalActive: updatedUsers.filter((u) => u.accessStatus !== 'inactive').length,
    });
  },

  deleteUser: (id: string) => {
    const updatedUsers = get().users.filter((user) => user.id !== id);
    const filtered = filterUsers(updatedUsers, get().filters);

    set({
      users: updatedUsers,
      filteredUsers: filtered,
      pagination: { ...get().pagination, total: filtered.length, current: 1 },
      totalActive: updatedUsers.filter((u) => u.accessStatus !== 'inactive').length,
    });
  },
}));
