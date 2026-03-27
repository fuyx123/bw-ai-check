import { conflict, notFound } from '../shared/errors';
import { getPagination, paginate } from '../shared/pagination';
import { getQueryString, type QueryParams } from '../shared/http';
import type { AppStore } from '../data/store';
import type { AuthenticatedUser, DepartmentLevel, DepartmentRecord } from '../types';
import { AccessService } from './access-service';
import { AuditService } from './audit-service';

interface CreateDepartmentInput {
  name: string;
  code: string;
  parentId: string | null;
  level: DepartmentLevel;
  leaderName: string;
  leaderTitle: string;
  staffCount: number;
}

interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  leaderName?: string;
  leaderTitle?: string;
  staffCount?: number;
}

const allowedChildren: Record<DepartmentLevel, DepartmentLevel[]> = {
  university: ['college'],
  college: ['stage', 'major', 'class'],
  stage: ['major', 'class'],
  major: ['class'],
  class: [],
};

export class DepartmentService {
  constructor(
    private readonly store: AppStore,
    private readonly accessService: AccessService,
    private readonly auditService: AuditService,
  ) {}

  list(currentUser: AuthenticatedUser, query: QueryParams) {
    const visible = this.accessService.filterDepartments(currentUser);
    const keyword = getQueryString(query, 'keyword');
    const level = getQueryString(query, 'level');
    const { page, pageSize } = getPagination(query);

    const filtered = visible.filter((department) => {
      if (level && department.level !== level) return false;
      if (!keyword) return true;
      return (
        department.name.includes(keyword) ||
        department.code.toLowerCase().includes(keyword.toLowerCase()) ||
        department.leaderName.includes(keyword)
      );
    });

    return paginate(filtered, page, pageSize);
  }

  getTree(currentUser: AuthenticatedUser) {
    return this.accessService.buildDepartmentTree(this.accessService.filterDepartments(currentUser));
  }

  getById(currentUser: AuthenticatedUser, departmentId: string) {
    const department = this.accessService.getDepartmentById(departmentId);
    if (!department) notFound(`部门不存在：${departmentId}`);
    if (!this.accessService.canAccessDepartment(currentUser, departmentId)) {
      notFound(`无权访问部门：${departmentId}`);
    }
    return department;
  }

  private assertLevel(parentId: string | null, level: DepartmentLevel): void {
    if (!parentId) {
      if (level !== 'college') {
        conflict('根部门下仅允许新增学院级部门');
      }
      return;
    }

    const parent = this.accessService.ensureDepartmentExists(parentId);
    if (!allowedChildren[parent.level].includes(level)) {
      conflict(`父级 ${parent.level} 下不允许创建 ${level} 级部门`);
    }
  }

  create(currentUser: AuthenticatedUser, input: CreateDepartmentInput): DepartmentRecord {
    if (input.parentId && !this.accessService.canAccessDepartment(currentUser, input.parentId)) {
      conflict('当前账号只能在自己的数据权限范围内创建部门');
    }

    if (this.store.departments.some((department) => department.code === input.code)) {
      conflict(`部门编码已存在：${input.code}`);
    }

    this.assertLevel(input.parentId, input.level);

    const createdAt = this.store.now();
    const department: DepartmentRecord = {
      id: this.store.createId('dept'),
      name: input.name,
      code: input.code,
      parentId: input.parentId,
      level: input.level,
      leader: {
        name: input.leaderName,
        title: input.leaderTitle,
      },
      leaderName: input.leaderName,
      leaderTitle: input.leaderTitle,
      staffCount: input.staffCount,
      status: 'operational',
      createdAt,
      updatedAt: createdAt,
    };

    this.store.departments.push(department);
    this.accessService.refreshUserDepartmentNames();
    this.auditService.record({
      action: '创建部门',
      operator: currentUser.name,
      target: department.id,
      type: 'success',
      detail: `创建部门 ${department.name}`,
    });
    return department;
  }

  update(currentUser: AuthenticatedUser, departmentId: string, input: UpdateDepartmentInput): DepartmentRecord {
    const index = this.store.departments.findIndex((department) => department.id === departmentId);
    if (index === -1) notFound(`部门不存在：${departmentId}`);
    if (!this.accessService.canAccessDepartment(currentUser, departmentId)) {
      conflict('当前账号只能编辑自己权限范围内的部门');
    }

    const current = this.store.departments[index];

    if (input.code && input.code !== current.code && this.store.departments.some((department) => department.code === input.code)) {
      conflict(`部门编码已存在：${input.code}`);
    }

    const updated: DepartmentRecord = {
      ...current,
      name: input.name ?? current.name,
      code: input.code ?? current.code,
      leaderName: input.leaderName ?? current.leaderName,
      leaderTitle: input.leaderTitle ?? current.leaderTitle,
      leader: {
        name: input.leaderName ?? current.leaderName,
        title: input.leaderTitle ?? current.leaderTitle,
      },
      staffCount: input.staffCount ?? current.staffCount,
      updatedAt: this.store.now(),
    };

    this.store.departments[index] = updated;
    this.accessService.refreshUserDepartmentNames();
    this.auditService.record({
      action: '更新部门',
      operator: currentUser.name,
      target: departmentId,
      type: 'success',
      detail: `更新部门 ${updated.name}`,
    });
    return updated;
  }

  delete(currentUser: AuthenticatedUser, departmentId: string): void {
    const department = this.accessService.getDepartmentById(departmentId);
    if (!department) notFound(`部门不存在：${departmentId}`);
    if (!this.accessService.canAccessDepartment(currentUser, departmentId)) {
      conflict('当前账号只能删除自己权限范围内的部门');
    }

    const hasChildren = this.store.departments.some((entry) => entry.parentId === departmentId);
    if (hasChildren) {
      conflict('请先删除子部门后再删除当前部门');
    }

    const hasUsers = this.store.users.some((user) => user.departmentId === departmentId || user.classId === departmentId);
    if (hasUsers) {
      conflict('当前部门下仍存在用户，不能直接删除');
    }

    this.store.departments = this.store.departments.filter((entry) => entry.id !== departmentId);
    this.accessService.refreshUserDepartmentNames();
    this.auditService.record({
      action: '删除部门',
      operator: currentUser.name,
      target: departmentId,
      type: 'warning',
      detail: `删除部门 ${department.name}`,
    });
  }
}
