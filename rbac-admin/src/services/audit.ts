import dayjs from 'dayjs';

import { http } from './http';
import type { AuditLog } from '../types/rbac';

export interface AuditLogFilters {
  action?: string;
  operator?: string;
  type?: AuditLog['type'];
  dateRange?: [string, string] | null;
}

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

function mapAuditLog(item: AuditLog): AuditLog {
  return {
    ...item,
    createdAt: item.createdAt || '',
  };
}

export async function fetchAuditLogs(
  page = 1,
  pageSize = 10,
  filters?: AuditLogFilters,
): Promise<AuditLogListResult> {
  const params: Record<string, string | number> = { page, pageSize };

  if (filters?.action) {
    params.action = filters.action.trim();
  }
  if (filters?.operator) {
    params.operator = filters.operator.trim();
  }
  if (filters?.type) {
    params.type = filters.type;
  }
  if (filters?.dateRange?.[0]) {
    params.startDate = dayjs(filters.dateRange[0]).startOf('day').toISOString();
  }
  if (filters?.dateRange?.[1]) {
    params.endDate = dayjs(filters.dateRange[1]).endOf('day').toISOString();
  }

  const response = await http.get('/audit/logs', { params });
  const payload = response.data.data;

  return {
    items: (payload.items ?? []).map(mapAuditLog),
    total: payload.total ?? 0,
    page: payload.page ?? page,
    pageSize: payload.pageSize ?? pageSize,
  };
}
