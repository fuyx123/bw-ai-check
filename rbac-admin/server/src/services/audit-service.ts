import { paginate } from '../shared/pagination';
import { getQueryString, type QueryParams } from '../shared/http';
import type { AuditLogRecord, AuditLogType, PaginationResult } from '../types';
import type { AppStore } from '../data/store';

interface RecordAuditInput {
  action: string;
  operator: string;
  target: string;
  type: AuditLogType;
  detail?: string;
}

export class AuditService {
  constructor(private readonly store: AppStore) {}

  record(input: RecordAuditInput): AuditLogRecord {
    const log: AuditLogRecord = {
      id: this.store.createId('audit'),
      createdAt: this.store.now(),
      ...input,
    };

    this.store.auditLogs.unshift(log);
    this.store.auditLogs = this.store.auditLogs.slice(0, 300);
    return log;
  }

  list(query: QueryParams): PaginationResult<AuditLogRecord> {
    const page = Number(getQueryString(query, 'page') || 1);
    const pageSize = Number(getQueryString(query, 'pageSize') || 10);
    const action = getQueryString(query, 'action');
    const operator = getQueryString(query, 'operator');
    const type = getQueryString(query, 'type');
    const startDate = getQueryString(query, 'startDate');
    const endDate = getQueryString(query, 'endDate');

    const filtered = this.store.auditLogs.filter((log) => {
      if (action && !log.action.includes(action)) return false;
      if (operator && !log.operator.includes(operator)) return false;
      if (type && log.type !== type) return false;
      if (startDate && log.createdAt < startDate) return false;
      if (endDate && log.createdAt > endDate) return false;
      return true;
    });

    return paginate(filtered, page, pageSize);
  }
}
