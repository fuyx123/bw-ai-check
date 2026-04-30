import type { MenuItem } from '../../types/rbac';

export const menus: MenuItem[] = [
  // Root menus matching Sidebar
  { id: 'menu-dashboard', name: '工作台', path: '/dashboard', icon: 'DashboardOutlined', parentId: null, sortOrder: 1, visible: true, type: 'menu' },
  { id: 'menu-access', name: '权限管理', path: '', icon: 'SafetyOutlined', parentId: null, sortOrder: 2, visible: true, type: 'menu' },
  { id: 'menu-audit', name: '审计日志', path: '/audit-logs', icon: 'AuditOutlined', parentId: null, sortOrder: 5, visible: true, type: 'menu' },
  { id: 'menu-exam', name: '阅卷管理', path: '/exam', icon: 'AuditOutlined', parentId: null, sortOrder: 6, visible: true, type: 'menu' },
  { id: 'menu-homework-approval', name: '作业审批', path: '/homework', icon: 'BookOutlined', parentId: null, sortOrder: 7, visible: true, type: 'menu' },
  { id: 'menu-cycle', name: '教学周期管理', path: '/cycles', icon: 'CalendarOutlined', parentId: null, sortOrder: 8, visible: true, type: 'menu' },
  { id: 'menu-model', name: '模型管理', path: '/models', icon: 'ApiOutlined', parentId: null, sortOrder: 9, visible: true, type: 'menu' },
  { id: 'menu-dept', name: '部门管理', path: '/departments', icon: 'ApartmentOutlined', parentId: 'menu-access', sortOrder: 1, visible: true, type: 'menu' },
  { id: 'menu-role', name: '角色管理', path: '/roles', icon: 'TeamOutlined', parentId: 'menu-access', sortOrder: 2, visible: true, type: 'menu' },
  { id: 'menu-user', name: '用户管理', path: '/users', icon: 'UserOutlined', parentId: 'menu-access', sortOrder: 3, visible: true, type: 'menu' },
  { id: 'menu-menu', name: '菜单管理', path: '/menus', icon: 'MenuOutlined', parentId: 'menu-access', sortOrder: 4, visible: true, type: 'menu' },

  // Button permissions for 部门管理
  { id: 'menu-dept-add', name: '新增部门', path: '', icon: '', parentId: 'menu-dept', sortOrder: 1, visible: true, type: 'button' },
  { id: 'menu-dept-edit', name: '编辑部门', path: '', icon: '', parentId: 'menu-dept', sortOrder: 2, visible: true, type: 'button' },
  { id: 'menu-dept-delete', name: '删除部门', path: '', icon: '', parentId: 'menu-dept', sortOrder: 3, visible: true, type: 'button' },
  { id: 'menu-dept-export', name: '导出架构', path: '', icon: '', parentId: 'menu-dept', sortOrder: 4, visible: true, type: 'button' },

  // Button permissions for 角色管理
  { id: 'menu-role-add', name: '创建角色', path: '', icon: '', parentId: 'menu-role', sortOrder: 1, visible: true, type: 'button' },
  { id: 'menu-role-edit', name: '编辑角色', path: '', icon: '', parentId: 'menu-role', sortOrder: 2, visible: true, type: 'button' },
  { id: 'menu-role-delete', name: '删除角色', path: '', icon: '', parentId: 'menu-role', sortOrder: 3, visible: true, type: 'button' },
  { id: 'menu-role-assign', name: '分配权限', path: '', icon: '', parentId: 'menu-role', sortOrder: 4, visible: true, type: 'button' },

  // Button permissions for 用户管理
  { id: 'menu-user-add', name: '新增用户', path: '', icon: '', parentId: 'menu-user', sortOrder: 1, visible: true, type: 'button' },
  { id: 'menu-user-edit', name: '编辑用户', path: '', icon: '', parentId: 'menu-user', sortOrder: 2, visible: true, type: 'button' },
  { id: 'menu-user-delete', name: '删除用户', path: '', icon: '', parentId: 'menu-user', sortOrder: 3, visible: true, type: 'button' },

  // Button permissions for 菜单管理
  { id: 'menu-menu-add', name: '新增菜单', path: '', icon: '', parentId: 'menu-menu', sortOrder: 1, visible: true, type: 'button' },
  { id: 'menu-menu-edit', name: '编辑菜单', path: '', icon: '', parentId: 'menu-menu', sortOrder: 2, visible: true, type: 'button' },
  { id: 'menu-menu-delete', name: '删除菜单', path: '', icon: '', parentId: 'menu-menu', sortOrder: 3, visible: true, type: 'button' },

  // Button permissions for 阅卷与教学周期
  { id: 'menu-exam-upload', name: '上传答题文件', path: '', icon: '', parentId: 'menu-exam', sortOrder: 1, visible: true, type: 'button' },
  { id: 'menu-exam-batch', name: '批量上传', path: '', icon: '', parentId: 'menu-exam', sortOrder: 2, visible: true, type: 'button' },
  { id: 'menu-exam-delete', name: '删除文件', path: '', icon: '', parentId: 'menu-exam', sortOrder: 3, visible: true, type: 'button' },
  { id: 'menu-cycle-manage', name: '周期管理操作', path: '', icon: '', parentId: 'menu-cycle', sortOrder: 1, visible: true, type: 'button' },
];

// Helper: build tree from flat list
export function buildMenuTree(flatMenus: MenuItem[] = menus): MenuItem[] {
  const map = new Map<string, MenuItem & { children?: MenuItem[] }>();
  const roots: MenuItem[] = [];
  for (const m of flatMenus) map.set(m.id, { ...m, children: [] });
  for (const m of flatMenus) {
    const node = map.get(m.id)!;
    if (m.parentId) {
      const parent = map.get(m.parentId);
      if (parent) parent.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

// Helper: get all menu IDs (for super admin)
export function getAllMenuIds(): string[] {
  return menus.map(m => m.id);
}
