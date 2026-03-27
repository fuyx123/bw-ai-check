import type { PaginationResult } from '../types';
import { getQueryString, type QueryParams } from './http';

function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function getPagination(query: QueryParams): { page: number; pageSize: number } {
  return {
    page: parsePositiveInteger(getQueryString(query, 'page'), 1),
    pageSize: parsePositiveInteger(getQueryString(query, 'pageSize'), 10),
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}
