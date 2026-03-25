import { create } from 'zustand';
import type { DataScope } from '../types/rbac';
import { roles } from '../mocks/data/roles';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  roleId: string;
  avatar?: string;
  dataScope: DataScope;
  email: string;
  phone: string;
}

interface AuthState {
  currentUser: CurrentUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  loginAsRole: (roleId: string) => void;
  logout: () => void;
  hasPermission: (menuId: string) => boolean;
  hasAnyPermission: (menuIds: string[]) => boolean;
  updateProfile: (updates: Partial<Pick<CurrentUser, 'name' | 'email' | 'phone'>>) => void;
  updatePassword: (oldPwd: string, newPwd: string) => boolean;
}

const defaultRole = roles.find((r) => r.id === 'role-president')!;

// 模拟用户账号（实际应从后端获取）
const mockAccounts: Record<string, { password: string; name: string; roleId: string; email: string; phone: string }> = {
  admin: { password: 'admin123', name: '赵明远', roleId: 'role-president', email: 'zhao@seuu.edu', phone: '13800000001' },
  dean: { password: '123456', name: '刘建国', roleId: 'role-dean', email: 'liu@seuu.edu', phone: '13800000002' },
  teacher: { password: '123456', name: '李德', roleId: 'role-lecturer', email: 'li@seuu.edu', phone: '13800000003' },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: {
    id: 'user-009',
    name: '赵明远',
    role: '校长',
    roleId: 'role-president',
    dataScope: 'school',
    email: 'zhao@seuu.edu',
    phone: '13800000001',
  },
  permissions: defaultRole.permissions,
  isAuthenticated: true,

  login: (username: string, password: string) => {
    const account = mockAccounts[username];
    if (!account || account.password !== password) return false;
    const role = roles.find((r) => r.id === account.roleId);
    if (!role) return false;
    set({
      currentUser: {
        id: `user-${username}`,
        name: account.name,
        role: role.name,
        roleId: role.id,
        dataScope: role.dataScope,
        email: account.email,
        phone: account.phone,
      },
      permissions: role.permissions,
      isAuthenticated: true,
    });
    return true;
  },

  loginAsRole: (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    set({
      currentUser: {
        id: `user-${roleId}`,
        name: role.name,
        role: role.name,
        roleId: role.id,
        dataScope: role.dataScope,
        email: '',
        phone: '',
      },
      permissions: role.permissions,
      isAuthenticated: true,
    });
  },

  logout: () =>
    set({ currentUser: null, permissions: [], isAuthenticated: false }),

  hasPermission: (menuId) => get().permissions.includes(menuId),
  hasAnyPermission: (menuIds) =>
    menuIds.some((id) => get().permissions.includes(id)),

  updateProfile: (updates) => {
    const user = get().currentUser;
    if (!user) return;
    set({ currentUser: { ...user, ...updates } });
  },

  updatePassword: (oldPwd: string, _newPwd: string) => {
    // 模拟：旧密码验证（这里简单判断非空即可）
    if (!oldPwd) return false;
    // 实际应调用后端 API
    return true;
  },
}));
