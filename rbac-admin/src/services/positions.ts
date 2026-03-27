import { http, unwrap } from './http';
import type { Position, PositionCategory } from '../types/rbac';

interface BackendPosition {
  id: string;
  name: string;
  code: string;
  categoryCode: string;
  level: number;
  description: string;
  headcount: number;
  createdAt: string;
}

interface BackendPositionCategory {
  code: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  description: string;
}

function mapPosition(position: BackendPosition): Position {
  return {
    id: position.id,
    name: position.name,
    code: position.code,
    category: position.categoryCode,
    level: position.level,
    description: position.description,
    headcount: position.headcount,
    createdAt: position.createdAt?.split('T')[0] || position.createdAt,
  };
}

function mapCategory(category: BackendPositionCategory): PositionCategory {
  return {
    id: category.code,
    code: category.code,
    name: category.name,
    color: category.color,
    icon: category.icon,
    sortOrder: category.sortOrder,
    description: category.description,
  };
}

export async function fetchPositions() {
  const [positionsResponse, categoriesResponse] = await Promise.all([
    http.get('/system/positions'),
    http.get('/system/position-categories'),
  ]);

  return {
    positions: unwrap<BackendPosition[]>(positionsResponse.data).map(mapPosition),
    categories: unwrap<BackendPositionCategory[]>(categoriesResponse.data).map(mapCategory),
  };
}

export async function createPosition(payload: Omit<Position, 'id' | 'createdAt' | 'category'> & { category: string }) {
  const response = await http.post('/system/positions', {
    ...payload,
    categoryCode: payload.category,
  });
  return mapPosition(unwrap<BackendPosition>(response.data));
}

export async function updatePosition(id: string, payload: Partial<Omit<Position, 'id' | 'createdAt'>> ) {
  const response = await http.put(`/system/positions/${id}`, {
    ...payload,
    categoryCode: payload.category,
  });
  return mapPosition(unwrap<BackendPosition>(response.data));
}

export async function deletePosition(id: string) {
  await http.delete(`/system/positions/${id}`);
}

export async function createPositionCategory(payload: Omit<PositionCategory, 'id'>) {
  const response = await http.post('/system/position-categories', payload);
  return mapCategory(unwrap<BackendPositionCategory>(response.data));
}

export async function updatePositionCategory(code: string, payload: Partial<Omit<PositionCategory, 'id' | 'code'>>) {
  const response = await http.put(`/system/position-categories/${code}`, payload);
  return mapCategory(unwrap<BackendPositionCategory>(response.data));
}

export async function deletePositionCategory(code: string) {
  await http.delete(`/system/position-categories/${code}`);
}
