import { create } from 'zustand';
import type { Role, DataScope } from '../types/rbac';
import {
  createRole as createRoleRequest,
  deleteRole as deleteRoleRequest,
  fetchRoles,
  updateRole as updateRoleRequest,
  updateRoleMenus as updateRoleMenusRequest,
} from '../services/roles';

interface RoleState {
  roles: Role[];
  selectedRole: Role | null;
  loading: boolean;
  fetchRoles: () => Promise<void>;
  selectRole: (id: string | null) => void;
  addRole: (role: Role) => Promise<void>;
  editRole: (id: string, updates: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  updateRolePermissions: (roleId: string, menuIds: string[]) => Promise<void>;
  updateRoleDataScope: (roleId: string, scope: DataScope) => Promise<void>;
  saveRoleAccess: (roleId: string, menuIds: string[], scope: DataScope) => Promise<Role>;
}

function sameMembers(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  for (const item of right) {
    if (!leftSet.has(item)) {
      return false;
    }
  }
  return true;
}

export const useRoleStore = create<RoleState>((set, get) => ({
  roles: [],
  selectedRole: null,
  loading: false,

  fetchRoles: async () => {
    set({ loading: true });
    const roles = await fetchRoles();
    const selectedId = get().selectedRole?.id;
    set({
      roles,
      selectedRole: selectedId ? roles.find((role) => role.id === selectedId) ?? null : null,
      loading: false,
    });
  },

  selectRole: (id) => {
    set({
      selectedRole: id ? get().roles.find((role) => role.id === id) ?? null : null,
    });
  },

  addRole: async (role) => {
    const created = await createRoleRequest({
      name: role.name,
      description: role.description,
      dataScope: role.dataScope,
    });
    const roles = [...get().roles, created];
    set({ roles, selectedRole: created });
  },

  editRole: async (id, updates) => {
    const updated = await updateRoleRequest(id, {
      name: updates.name,
      description: updates.description,
      dataScope: updates.dataScope,
    });
    const roles = get().roles.map((role) => (role.id === id ? updated : role));
    set({
      roles,
      selectedRole: get().selectedRole?.id === id ? updated : get().selectedRole,
    });
  },

  deleteRole: async (id) => {
    await deleteRoleRequest(id);
    const roles = get().roles.filter((role) => role.id !== id);
    set({
      roles,
      selectedRole: get().selectedRole?.id === id ? null : get().selectedRole,
    });
  },

  updateRolePermissions: async (roleId, menuIds) => {
    const updated = await updateRoleMenusRequest(roleId, menuIds);
    const roles = get().roles.map((role) => (role.id === roleId ? updated : role));
    set({
      roles,
      selectedRole: get().selectedRole?.id === roleId ? updated : get().selectedRole,
    });
  },

  updateRoleDataScope: async (roleId, scope) => {
    const updated = await updateRoleRequest(roleId, { dataScope: scope });
    const roles = get().roles.map((role) => (role.id === roleId ? updated : role));
    set({
      roles,
      selectedRole: get().selectedRole?.id === roleId ? updated : get().selectedRole,
    });
  },

  saveRoleAccess: async (roleId, menuIds, scope) => {
    const currentRole = get().roles.find((role) => role.id === roleId);
    if (!currentRole) {
      throw new Error('角色不存在');
    }

    let updatedRole = currentRole;
    const normalizedMenuIds = Array.from(new Set(menuIds));

    if (!sameMembers(currentRole.permissions, normalizedMenuIds)) {
      updatedRole = await updateRoleMenusRequest(roleId, normalizedMenuIds);
    }

    if (updatedRole.dataScope !== scope) {
      updatedRole = await updateRoleRequest(roleId, { dataScope: scope });
    }

    const roles = get().roles.map((role) => (role.id === roleId ? updatedRole : role));
    set({
      roles,
      selectedRole: get().selectedRole?.id === roleId ? updatedRole : get().selectedRole,
    });

    return updatedRole;
  },
}));
