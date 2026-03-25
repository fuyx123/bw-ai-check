import { create } from 'zustand';
import type { MenuItem } from '../types/rbac';
import { menus as initialMenus, buildMenuTree } from '../mocks/data/menus';

interface MenuState {
  menus: MenuItem[];
  menuTree: MenuItem[];
  loading: boolean;
  fetchMenus: () => void;
  addMenu: (menu: MenuItem) => void;
  editMenu: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenu: (id: string) => void;
  getMenuTree: () => MenuItem[];
  getAllMenuIds: () => string[];
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menus: initialMenus,
  menuTree: buildMenuTree(initialMenus),
  loading: false,

  fetchMenus: () => {
    set({ menus: initialMenus, menuTree: buildMenuTree(initialMenus) });
  },

  addMenu: (menu) => {
    set((s) => {
      const newMenus = [...s.menus, menu];
      return { menus: newMenus, menuTree: buildMenuTree(newMenus) };
    });
  },

  editMenu: (id, updates) => {
    set((s) => {
      const newMenus = s.menus.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      );
      return { menus: newMenus, menuTree: buildMenuTree(newMenus) };
    });
  },

  deleteMenu: (id) => {
    set((s) => {
      const toDelete = new Set<string>();
      const collectChildren = (parentId: string) => {
        toDelete.add(parentId);
        s.menus
          .filter((m) => m.parentId === parentId)
          .forEach((m) => collectChildren(m.id));
      };
      collectChildren(id);
      const newMenus = s.menus.filter((m) => !toDelete.has(m.id));
      return { menus: newMenus, menuTree: buildMenuTree(newMenus) };
    });
  },

  getMenuTree: () => get().menuTree,
  getAllMenuIds: () => get().menus.map((m) => m.id),
}));
