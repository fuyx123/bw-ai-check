import { randomUUID } from 'node:crypto';
import type {
  AuditLogRecord,
  AuthSession,
  DepartmentRecord,
  GradeRecord,
  MenuRecord,
  RoleRecord,
  SeedData,
  UserRecord,
} from '../types';

export class AppStore {
  departments: DepartmentRecord[];
  menus: MenuRecord[];
  roles: RoleRecord[];
  users: UserRecord[];
  grades: GradeRecord[];
  auditLogs: AuditLogRecord[];
  sessions: Map<string, AuthSession>;

  private readonly seed: SeedData;

  constructor(seed: SeedData) {
    this.seed = structuredClone(seed);
    this.departments = structuredClone(seed.departments);
    this.menus = structuredClone(seed.menus);
    this.roles = structuredClone(seed.roles);
    this.users = structuredClone(seed.users);
    this.grades = structuredClone(seed.grades);
    this.auditLogs = structuredClone(seed.auditLogs);
    this.sessions = new Map();
  }

  reset(): void {
    this.departments = structuredClone(this.seed.departments);
    this.menus = structuredClone(this.seed.menus);
    this.roles = structuredClone(this.seed.roles);
    this.users = structuredClone(this.seed.users);
    this.grades = structuredClone(this.seed.grades);
    this.auditLogs = structuredClone(this.seed.auditLogs);
    this.sessions.clear();
  }

  createId(prefix: string): string {
    return `${prefix}-${randomUUID().slice(0, 8)}`;
  }

  now(): string {
    return new Date().toISOString();
  }
}
