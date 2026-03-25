import { create } from 'zustand';
import type { Role, DataScope } from '../types/rbac';
import { roles as initialRoles } from '../mocks/data/roles';

interface RoleState {
  roles: Role[];
  selectedRole: Role | null;
  loading: boolean;
  fetchRoles: () => void;
  selectRole: (id: string | null) => void;
  addRole: (role: Role) => void;
  editRole: (id: string, updates: Partial<Role>) => void;
  deleteRole: (id: string) => void;
  updateRolePermissions: (roleId: string, menuIds: string[]) => void;
  updateRoleDataScope: (roleId: string, scope: DataScope) => void;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  roles: initialRoles,
  selectedRole: null,
  loading: false,

  fetchRoles: () => {
    set({ roles: initialRoles, loading: false });
  },

  selectRole: (id) => {
    if (!id) {
      set({ selectedRole: null });
      return;
    }
    set({ selectedRole: get().roles.find((r) => r.id === id) ?? null });
  },

  addRole: (role) => {
    set((s) => ({ roles: [...s.roles, role] }));
  },

  editRole: (id, updates) => {
    set((s) => {
      const roles = s.roles.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      );
      const selected =
        s.selectedRole?.id === id
          ? { ...s.selectedRole, ...updates }
          : s.selectedRole;
      return { roles, selectedRole: selected as Role | null };
    });
  },

  deleteRole: (id) => {
    set((s) => ({
      roles: s.roles.filter((r) => r.id !== id),
      selectedRole: s.selectedRole?.id === id ? null : s.selectedRole,
    }));
  },

  updateRolePermissions: (roleId, menuIds) => {
    set((s) => {
      const roles = s.roles.map((r) =>
        r.id === roleId ? { ...r, permissions: menuIds } : r,
      );
      const selected =
        s.selectedRole?.id === roleId
          ? { ...s.selectedRole, permissions: menuIds }
          : s.selectedRole;
      return { roles, selectedRole: selected as Role | null };
    });
  },

  updateRoleDataScope: (roleId, scope) => {
    set((s) => {
      const roles = s.roles.map((r) =>
        r.id === roleId ? { ...r, dataScope: scope } : r,
      );
      const selected =
        s.selectedRole?.id === roleId
          ? { ...s.selectedRole, dataScope: scope }
          : s.selectedRole;
      return { roles, selectedRole: selected as Role | null };
    });
  },
}));
