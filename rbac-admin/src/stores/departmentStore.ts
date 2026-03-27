import { create } from 'zustand';
import type { Department, DepartmentLevel } from '../types/rbac';
import {
  createDepartment as createDepartmentRequest,
  deleteDepartment as deleteDepartmentRequest,
  fetchDepartmentTree,
  updateDepartment as updateDepartmentRequest,
} from '../services/departments';

interface DepartmentState {
  departments: Department[];
  flatDepartments: Department[];
  selectedDepartment: Department | null;
  loading: boolean;
  fetchDepartments: () => Promise<void>;
  selectDepartment: (id: string | null) => void;
  getDepartmentsByParent: (parentId: string | null) => Department[];
  addDepartment: (parentId: string, dept: Department) => Promise<void>;
  addRootDepartment: (dept: Department) => Promise<void>;
  editDepartment: (id: string, updates: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

function flattenDepartments(departments: Department[]): Department[] {
  return departments.flatMap((dept) => [dept, ...(dept.children ? flattenDepartments(dept.children) : [])]);
}

function inferChildLevel(parent: Department | null): DepartmentLevel {
  if (!parent) return 'university';
  switch (parent.level) {
    case 'university':
      return 'college';
    case 'college':
      return 'stage';
    case 'stage':
      return 'major';
    default:
      return 'class';
  }
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: [],
  flatDepartments: [],
  selectedDepartment: null,
  loading: false,

  fetchDepartments: async () => {
    set({ loading: true });
    const departments = await fetchDepartmentTree();
    const flat = flattenDepartments(departments);
    const selectedId = get().selectedDepartment?.id ?? null;
    set({
      departments,
      flatDepartments: flat,
      selectedDepartment: selectedId ? flat.find((dept) => dept.id === selectedId) ?? null : null,
      loading: false,
    });
  },

  selectDepartment: (id) => {
    const selectedDepartment = id
      ? get().flatDepartments.find((dept) => dept.id === id) ?? null
      : null;
    set({ selectedDepartment });
  },

  getDepartmentsByParent: (parentId) => get().flatDepartments.filter((dept) => dept.parentId === parentId),

  addDepartment: async (parentId, dept) => {
    const parent = get().flatDepartments.find((item) => item.id === parentId) ?? null;
    await createDepartmentRequest({
      name: dept.name,
      code: dept.code,
      parentId,
      level: inferChildLevel(parent),
      leaderName: dept.leader.name,
      leaderTitle: dept.leader.title,
      staffCount: dept.staffCount,
    });
    await get().fetchDepartments();
  },

  addRootDepartment: async (dept) => {
    await createDepartmentRequest({
      name: dept.name,
      code: dept.code,
      parentId: null,
      level: 'university',
      leaderName: dept.leader.name,
      leaderTitle: dept.leader.title,
      staffCount: dept.staffCount,
    });
    await get().fetchDepartments();
  },

  editDepartment: async (id, updates) => {
    await updateDepartmentRequest(id, {
      name: updates.name,
      code: updates.code,
      level: updates.level,
      leaderName: updates.leader?.name,
      leaderTitle: updates.leader?.title,
      staffCount: updates.staffCount,
    });
    await get().fetchDepartments();
  },

  deleteDepartment: async (id) => {
    await deleteDepartmentRequest(id);
    await get().fetchDepartments();
  },
}));
