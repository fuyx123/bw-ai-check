import { conflict } from '../shared/errors';
import { paginate } from '../shared/pagination';
import type { AppStore } from '../data/store';
import type { AuthenticatedUser, GradeRecord } from '../types';
import { AuditService } from './audit-service';

interface CreateGradeInput {
  code: string;
  name: string;
  level: number;
  description: string;
}

export class GradeService {
  constructor(
    private readonly store: AppStore,
    private readonly auditService: AuditService,
  ) {}

  list(page: number, pageSize: number) {
    const sorted = [...this.store.grades].sort((left, right) => left.level - right.level);
    return paginate(sorted, page, pageSize);
  }

  create(currentUser: AuthenticatedUser, input: CreateGradeInput): GradeRecord {
    if (this.store.grades.some((grade) => grade.code === input.code)) {
      conflict(`职级编码已存在：${input.code}`);
    }

    const now = this.store.now();
    const grade: GradeRecord = {
      id: this.store.createId('grade'),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.store.grades.push(grade);
    this.auditService.record({
      action: '创建职级',
      operator: currentUser.name,
      target: grade.id,
      type: 'success',
      detail: `创建职级 ${grade.name}`,
    });
    return grade;
  }
}
