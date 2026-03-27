import { create } from 'zustand';
import type { MenuItem } from '../types/rbac';
import {
  createMenu as createMenuRequest,
  deleteMenu as deleteMenuRequest,
  fetchMenuTree,
  fetchUserMenuTree,
  updateMenu as updateMenuRequest,
} from '../services/menus';

interface MenuState {
  menus: MenuItem[];
  menuTree: MenuItem[];
  navigationMenus: MenuItem[];
  navigationTree: MenuItem[];
  loading: boolean;
  fetchMenus: () => Promise<void>;
  fetchNavigationMenus: () => Promise<void>;
  clearMenus: () => void;
  addMenu: (menu: MenuItem) => Promise<void>;
  editMenu: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenu: (id: string) => Promise<void>;
  getMenuTree: () => MenuItem[];
  getAllMenuIds: () => string[];
}

export const useMenuStore = create<MenuState>((set, get) => ({
  menus: [],
  menuTree: [],
  navigationMenus: [],
  navigationTree: [],
  loading: false,

  fetchMenus: async () => {
    set({ loading: true });
    const { flat, tree } = await fetchMenuTree();
    set({ menus: flat, menuTree: tree, loading: false });
  },

  fetchNavigationMenus: async () => {
    set({ loading: true });
    const { flat, tree } = await fetchUserMenuTree();
    set({ navigationMenus: flat, navigationTree: tree, loading: false });
  },

  clearMenus: () => set({
    menus: [],
    menuTree: [],
    navigationMenus: [],
    navigationTree: [],
    loading: false,
  }),

  addMenu: async (menu) => {
    await createMenuRequest({
      name: menu.name,
      path: menu.path,
      icon: menu.icon,
      parentId: menu.parentId,
      sortOrder: menu.sortOrder,
      visible: menu.visible,
      type: menu.type,
    });
    await get().fetchMenus();
  },

  editMenu: async (id, updates) => {
    await updateMenuRequest(id, {
      name: updates.name,
      path: updates.path,
      icon: updates.icon,
      parentId: updates.parentId,
      sortOrder: updates.sortOrder,
      visible: updates.visible,
      type: updates.type,
    });
    await get().fetchMenus();
  },

  deleteMenu: async (id) => {
    await deleteMenuRequest(id);
    await get().fetchMenus();
  },

  getMenuTree: () => get().menuTree,
  getAllMenuIds: () => get().menus.map((item) => item.id),
}));
