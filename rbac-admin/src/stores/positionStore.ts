import { create } from 'zustand';
import type { Position, PositionCategory } from '../types/rbac';
import {
  createPosition as createPositionRequest,
  createPositionCategory as createPositionCategoryRequest,
  deletePosition as deletePositionRequest,
  deletePositionCategory as deletePositionCategoryRequest,
  fetchPositions,
  updatePosition as updatePositionRequest,
  updatePositionCategory as updatePositionCategoryRequest,
} from '../services/positions';

interface PositionState {
  positions: Position[];
  categories: PositionCategory[];
  loading: boolean;
  fetchPositions: () => Promise<void>;
  addPosition: (pos: Position) => Promise<void>;
  editPosition: (id: string, updates: Partial<Position>) => Promise<void>;
  deletePosition: (id: string) => Promise<void>;
  getByCategory: (catCode: string) => Position[];
  addCategory: (cat: PositionCategory) => Promise<void>;
  editCategory: (id: string, updates: Partial<PositionCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryByCode: (code: string) => PositionCategory | undefined;
}

export const usePositionStore = create<PositionState>((set, get) => ({
  positions: [],
  categories: [],
  loading: false,

  fetchPositions: async () => {
    set({ loading: true });
    const { positions, categories } = await fetchPositions();
    set({ positions, categories, loading: false });
  },

  addPosition: async (pos) => {
    await createPositionRequest({
      name: pos.name,
      code: pos.code,
      category: pos.category,
      level: pos.level,
      description: pos.description,
      headcount: pos.headcount,
    });
    await get().fetchPositions();
  },

  editPosition: async (id, updates) => {
    await updatePositionRequest(id, updates);
    await get().fetchPositions();
  },

  deletePosition: async (id) => {
    await deletePositionRequest(id);
    await get().fetchPositions();
  },

  getByCategory: (catCode) => get().positions.filter((position) => position.category === catCode),

  addCategory: async (cat) => {
    await createPositionCategoryRequest({
      code: cat.code,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
      description: cat.description,
    });
    await get().fetchPositions();
  },

  editCategory: async (id, updates) => {
    await updatePositionCategoryRequest(id, updates);
    await get().fetchPositions();
  },

  deleteCategory: async (id) => {
    await deletePositionCategoryRequest(id);
    await get().fetchPositions();
  },

  getCategoryByCode: (code) => get().categories.find((category) => category.code === code),
}));
