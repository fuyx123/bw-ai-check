import { http, unwrap } from './http';
import type { MenuItem } from '../types/rbac';

function flattenMenus(tree: MenuItem[]): MenuItem[] {
  return tree.flatMap((item) => [item, ...(item.children ? flattenMenus(item.children) : [])]);
}

export async function fetchMenuTree() {
  const response = await http.get('/system/menus/tree');
  const tree = unwrap<MenuItem[]>(response.data);
  return {
    tree,
    flat: flattenMenus(tree),
  };
}

export async function fetchUserMenuTree() {
  const response = await http.get('/system/menus/user-menus');
  const tree = unwrap<MenuItem[]>(response.data);
  return {
    tree,
    flat: flattenMenus(tree),
  };
}

export async function createMenu(payload: Omit<MenuItem, 'id' | 'children'>) {
  const response = await http.post('/system/menus', payload);
  return unwrap<MenuItem>(response.data);
}

export async function updateMenu(id: string, payload: Partial<Omit<MenuItem, 'id' | 'children'>>) {
  const response = await http.put(`/system/menus/${id}`, payload);
  return unwrap<MenuItem>(response.data);
}

export async function deleteMenu(id: string) {
  await http.delete(`/system/menus/${id}`);
}
