import { create } from 'zustand';
import type { Department } from '../types/rbac';
import { departments as initialDepartments, flattenDepartments } from '../mocks/data/departments';

interface DepartmentState {
  departments: Department[];
  flatDepartments: Department[];
  selectedDepartment: Department | null;
  loading: boolean;
  fetchDepartments: () => void;
  selectDepartment: (id: string | null) => void;
  getDepartmentsByParent: (parentId: string | null) => Department[];
  addDepartment: (parentId: string, dept: Department) => void;
  addRootDepartment: (dept: Department) => void;
  editDepartment: (id: string, updates: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
}

function insertChild(tree: Department[], parentId: string, child: Department): Department[] {
  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children || []), child] };
    }
    if (node.children?.length) {
      return { ...node, children: insertChild(node.children, parentId, child) };
    }
    return node;
  });
}

function updateNode(tree: Department[], id: string, updates: Partial<Department>): Department[] {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, ...updates, children: node.children };
    }
    if (node.children?.length) {
      return { ...node, children: updateNode(node.children, id, updates) };
    }
    return node;
  });
}

function removeNode(tree: Department[], id: string): Department[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.children?.length) {
        return { ...node, children: removeNode(node.children, id) };
      }
      return node;
    });
}

function refreshState(departments: Department[], selectedId: string | null) {
  const flat = flattenDepartments(departments);
  const selected = selectedId ? flat.find((d) => d.id === selectedId) ?? null : null;
  return { departments, flatDepartments: flat, selectedDepartment: selected };
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: initialDepartments,
  flatDepartments: flattenDepartments(initialDepartments),
  selectedDepartment: null,
  loading: false,

  fetchDepartments: () => {
    const { departments } = get();
    set({
      flatDepartments: flattenDepartments(departments),
      loading: false,
    });
  },

  selectDepartment: (id: string | null) => {
    if (!id) {
      set({ selectedDepartment: null });
      return;
    }
    const flat = get().flatDepartments;
    const found = flat.find((d) => d.id === id) ?? null;
    set({ selectedDepartment: found });
  },

  getDepartmentsByParent: (parentId: string | null) => {
    return get().flatDepartments.filter((d) => d.parentId === parentId);
  },

  addDepartment: (parentId: string, dept: Department) => {
    const newTree = insertChild(get().departments, parentId, dept);
    const selectedId = get().selectedDepartment?.id ?? null;
    set(refreshState(newTree, selectedId));
  },

  addRootDepartment: (dept: Department) => {
    const newTree = [...get().departments, dept];
    const selectedId = get().selectedDepartment?.id ?? null;
    set(refreshState(newTree, selectedId));
  },

  editDepartment: (id: string, updates: Partial<Department>) => {
    const newTree = updateNode(get().departments, id, {
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    const selectedId = get().selectedDepartment?.id ?? null;
    set(refreshState(newTree, selectedId));
  },

  deleteDepartment: (id: string) => {
    const newTree = removeNode(get().departments, id);
    const selectedId = get().selectedDepartment?.id ?? null;
    // 如果删除的是当前选中的部门，清空选中
    const newSelectedId = selectedId === id ? null : selectedId;
    set(refreshState(newTree, newSelectedId));
  },
}));
