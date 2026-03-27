import { create } from 'zustand';
import type { DataScope, UserType } from '../types/rbac';
import {
  fetchCurrentUser,
  getRestoredAuthState,
  login as loginRequest,
  logout as logoutRequest,
  type CurrentUser,
} from '../services/auth';
import { persistSession } from '../services/http';

interface AuthState {
  currentUser: CurrentUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  initializing: boolean;
  login: (loginId: string, password: string, userType: UserType) => Promise<boolean>;
  loginAsRole: (roleId: string) => void;
  refreshCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (menuId: string) => boolean;
  hasAnyPermission: (menuIds: string[]) => boolean;
  updateProfile: (updates: Partial<Pick<CurrentUser, 'name' | 'email' | 'phone'>>) => Promise<void>;
  updatePassword: (oldPwd: string, newPwd: string) => Promise<boolean>;
}

const restored = getRestoredAuthState();

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: restored.user,
  permissions: restored.permissions,
  isAuthenticated: !!restored.user,
  initializing: false,

  login: async (loginId, password, userType) => {
    const result = await loginRequest({ loginId, password, userType });
    set({
      currentUser: result.currentUser,
      permissions: result.permissions,
      isAuthenticated: true,
    });
    return true;
  },

  loginAsRole: () => {
    // 兼容旧页面 API，当前不再使用 mock 角色切换
  },

  refreshCurrentUser: async () => {
    const currentUser = await fetchCurrentUser();
    set({ currentUser, isAuthenticated: true });
    persistSession(currentUser, get().permissions);
  },

  logout: async () => {
    await logoutRequest();
    set({ currentUser: null, permissions: [], isAuthenticated: false });
  },

  hasPermission: (menuId) => get().permissions.includes(menuId),
  hasAnyPermission: (menuIds) => menuIds.some((id) => get().permissions.includes(id)),

  updateProfile: async (updates) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;
    const nextUser = { ...currentUser, ...updates };
    set({ currentUser: nextUser });
    persistSession(nextUser, get().permissions);
  },

  updatePassword: async (oldPwd, newPwd) => {
    return Boolean(oldPwd && newPwd && newPwd.length >= 6);
  },
}));

export type { CurrentUser, DataScope };
