import { create } from 'zustand';
import type { Position, PositionCategory } from '../types/rbac';
import {
  positions as initialPositions,
  positionCategories as initialCategories,
} from '../mocks/data/positions';

interface PositionState {
  positions: Position[];
  categories: PositionCategory[];
  loading: boolean;
  fetchPositions: () => void;
  addPosition: (pos: Position) => void;
  editPosition: (id: string, updates: Partial<Position>) => void;
  deletePosition: (id: string) => void;
  getByCategory: (catCode: string) => Position[];
  addCategory: (cat: PositionCategory) => void;
  editCategory: (id: string, updates: Partial<PositionCategory>) => void;
  deleteCategory: (id: string) => void;
  getCategoryByCode: (code: string) => PositionCategory | undefined;
}

export const usePositionStore = create<PositionState>((set, get) => ({
  positions: initialPositions,
  categories: initialCategories,
  loading: false,

  fetchPositions: () => {
    set({ positions: initialPositions, categories: initialCategories, loading: false });
  },

  addPosition: (pos) => {
    set((s) => ({ positions: [...s.positions, pos] }));
  },

  editPosition: (id, updates) => {
    set((s) => ({
      positions: s.positions.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  deletePosition: (id) => {
    set((s) => ({
      positions: s.positions.filter((p) => p.id !== id),
    }));
  },

  getByCategory: (catCode) => {
    return get().positions.filter((p) => p.category === catCode);
  },

  addCategory: (cat) => {
    set((s) => ({ categories: [...s.categories, cat] }));
  },

  editCategory: (id, updates) => {
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  deleteCategory: (id) => {
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
    }));
  },

  getCategoryByCode: (code) => {
    return get().categories.find((c) => c.code === code);
  },
}));
