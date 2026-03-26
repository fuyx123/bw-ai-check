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

export const useUserStore = create<UserState>((set, get) => ({
  users: users,
  filteredUsers: users,
  filters: {},
  pagination: {
    current: 1,
    pageSize: 10,
    total: users.length,
  },
  totalActive: users.filter((u) => u.accessStatus !== 'inactive').length,
  loading: false,

  fetchUsers: () => {
    set({ loading: true });
    setTimeout(() => {
      const filtered = filterUsers(users, get().filters);
      set({
        users: users,
        filteredUsers: filtered,
        pagination: { ...get().pagination, total: filtered.length, current: 1 },
        totalActive: users.filter((u) => u.accessStatus !== 'inactive').length,
        loading: false,
      });
    }, 300);
  },

  setFilter: (newFilters: Partial<UserFilters>) => {
    const merged = { ...get().filters, ...newFilters };
    const filtered = filterUsers(users, merged);
    set({
      filters: merged,
      filteredUsers: filtered,
      pagination: { ...get().pagination, total: filtered.length, current: 1 },
    });
  },

  clearFilters: () => {
    set({
      filters: {},
      filteredUsers: users,
      pagination: { ...get().pagination, total: users.length, current: 1 },
    });
  },

  applyFilters: () => {
    const filtered = filterUsers(users, get().filters);
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
}));
