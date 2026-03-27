import type { AppConfig } from '../config/env';
import type { AppStore } from '../data/store';
import { AccessService } from './access-service';
import { AuditService } from './audit-service';
import { AuthService } from './auth-service';
import { DepartmentService } from './department-service';
import { GradeService } from './grade-service';
import { MenuService } from './menu-service';
import { PositionService } from './position-service';
import { RoleService } from './role-service';
import { UserService } from './user-service';

export function createServices(store: AppStore, config: AppConfig) {
  const accessService = new AccessService(store);
  const auditService = new AuditService(store);
  const authService = new AuthService(store, config, accessService);

  return {
    accessService,
    auditService,
    authService,
    departmentService: new DepartmentService(store, accessService, auditService),
    userService: new UserService(store, accessService, auditService, authService),
    roleService: new RoleService(store, accessService, auditService),
    menuService: new MenuService(store, accessService, auditService),
    positionService: new PositionService(store, auditService),
    gradeService: new GradeService(store, auditService),
  };
}
