import { conflict, notFound } from '../shared/errors';
import { getPagination, paginate } from '../shared/pagination';
import { getQueryString, type QueryParams } from '../shared/http';
import type { AppStore } from '../data/store';
import type {
  AuthenticatedUser,
  PositionCategoryRecord,
  PositionRecord,
} from '../types';
import { AuditService } from './audit-service';

interface CreateCategoryInput {
  code: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  description: string;
}

type UpdateCategoryInput = Partial<CreateCategoryInput>;

interface CreatePositionInput {
  name: string;
  code: string;
  category: string;
  level: number;
  description: string;
  headcount: number;
}

type UpdatePositionInput = Partial<CreatePositionInput>;

export class PositionService {
  constructor(
    private readonly store: AppStore,
    private readonly auditService: AuditService,
  ) {}

  listCategories(): PositionCategoryRecord[] {
    return [...this.store.positionCategories].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  createCategory(currentUser: AuthenticatedUser, input: CreateCategoryInput): PositionCategoryRecord {
    if (this.store.positionCategories.some((category) => category.code === input.code)) {
      conflict(`岗位分类编码已存在：${input.code}`);
    }

    const now = this.store.now();
    const category: PositionCategoryRecord = {
      id: this.store.createId('cat'),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.store.positionCategories.push(category);
    this.auditService.record({
      action: '创建岗位分类',
      operator: currentUser.name,
      target: category.id,
      type: 'success',
      detail: `创建岗位分类 ${category.name}`,
    });
    return category;
  }

  updateCategory(currentUser: AuthenticatedUser, categoryId: string, input: UpdateCategoryInput): PositionCategoryRecord {
    const index = this.store.positionCategories.findIndex((category) => category.id === categoryId);
    if (index === -1) notFound(`岗位分类不存在：${categoryId}`);

    const current = this.store.positionCategories[index];
    if (input.code && input.code !== current.code && this.store.positionCategories.some((category) => category.code === input.code)) {
      conflict(`岗位分类编码已存在：${input.code}`);
    }

    const updated: PositionCategoryRecord = {
      ...current,
      ...input,
      updatedAt: this.store.now(),
    };

    this.store.positionCategories[index] = updated;
    if (input.code && input.code !== current.code) {
      this.store.positions = this.store.positions.map((position) =>
        position.category === current.code
          ? { ...position, category: input.code!, updatedAt: this.store.now() }
          : position,
      );
    }

    this.auditService.record({
      action: '更新岗位分类',
      operator: currentUser.name,
      target: categoryId,
      type: 'success',
      detail: `更新岗位分类 ${updated.name}`,
    });
    return updated;
  }

  deleteCategory(currentUser: AuthenticatedUser, categoryId: string): void {
    const category = this.store.positionCategories.find((entry) => entry.id === categoryId);
    if (!category) notFound(`岗位分类不存在：${categoryId}`);

    if (this.store.positions.some((position) => position.category === category.code)) {
      conflict('当前岗位分类下仍存在岗位，不能直接删除');
    }

    this.store.positionCategories = this.store.positionCategories.filter((entry) => entry.id !== categoryId);
    this.auditService.record({
      action: '删除岗位分类',
      operator: currentUser.name,
      target: categoryId,
      type: 'warning',
      detail: `删除岗位分类 ${category.name}`,
    });
  }

  listPositions(query: QueryParams) {
    const keyword = getQueryString(query, 'keyword')?.toLowerCase();
    const category = getQueryString(query, 'category');
    const { page, pageSize } = getPagination(query);

    const filtered = this.store.positions.filter((position) => {
      if (category && position.category !== category) return false;
      if (!keyword) return true;
      return (
        position.name.toLowerCase().includes(keyword) ||
        position.code.toLowerCase().includes(keyword) ||
        position.description.toLowerCase().includes(keyword)
      );
    });

    return paginate(filtered, page, pageSize);
  }

  createPosition(currentUser: AuthenticatedUser, input: CreatePositionInput): PositionRecord {
    if (!this.store.positionCategories.some((category) => category.code === input.category)) {
      notFound(`岗位分类不存在：${input.category}`);
    }
    if (this.store.positions.some((position) => position.code === input.code)) {
      conflict(`岗位编码已存在：${input.code}`);
    }

    const now = this.store.now();
    const position: PositionRecord = {
      id: this.store.createId('pos'),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.store.positions.push(position);
    this.auditService.record({
      action: '创建岗位',
      operator: currentUser.name,
      target: position.id,
      type: 'success',
      detail: `创建岗位 ${position.name}`,
    });
    return position;
  }

  updatePosition(currentUser: AuthenticatedUser, positionId: string, input: UpdatePositionInput): PositionRecord {
    const index = this.store.positions.findIndex((position) => position.id === positionId);
    if (index === -1) notFound(`岗位不存在：${positionId}`);

    const current = this.store.positions[index];
    if (input.category && !this.store.positionCategories.some((category) => category.code === input.category)) {
      notFound(`岗位分类不存在：${input.category}`);
    }
    if (input.code && input.code !== current.code && this.store.positions.some((position) => position.code === input.code)) {
      conflict(`岗位编码已存在：${input.code}`);
    }

    const updated: PositionRecord = {
      ...current,
      ...input,
      updatedAt: this.store.now(),
    };

    this.store.positions[index] = updated;
    this.auditService.record({
      action: '更新岗位',
      operator: currentUser.name,
      target: positionId,
      type: 'success',
      detail: `更新岗位 ${updated.name}`,
    });
    return updated;
  }

  deletePosition(currentUser: AuthenticatedUser, positionId: string): void {
    const position = this.store.positions.find((entry) => entry.id === positionId);
    if (!position) notFound(`岗位不存在：${positionId}`);

    this.store.positions = this.store.positions.filter((entry) => entry.id !== positionId);
    this.auditService.record({
      action: '删除岗位',
      operator: currentUser.name,
      target: positionId,
      type: 'warning',
      detail: `删除岗位 ${position.name}`,
    });
  }
}
