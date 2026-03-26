import { create } from 'zustand';
import type { DataScope, UserType } from '../types/rbac';
import { roles } from '../mocks/data/roles';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  roleId: string;
  avatar?: string;
  dataScope: DataScope;
  email: string;
  phone: string;
  userType: UserType;
  loginId: string;
}

interface AuthState {
  currentUser: CurrentUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  login: (loginId: string, password: string, userType: UserType) => boolean;
  loginAsRole: (roleId: string) => void;
  logout: () => void;
  hasPermission: (menuId: string) => boolean;
  hasAnyPermission: (menuIds: string[]) => boolean;
  updateProfile: (updates: Partial<Pick<CurrentUser, 'name' | 'email' | 'phone'>>) => void;
  updatePassword: (oldPwd: string, newPwd: string) => boolean;
}

const defaultRole = roles.find((r) => r.id === 'role-president')!;

// 教职工账号（用职工号登录）
const staffAccounts: Record<string, { password: string; name: string; roleId: string; email: string; phone: string }> = {
  // 支持用户名或职工号登录
  admin:  { password: 'admin123', name: '王建国', roleId: 'role-president',       email: 'wang.jianguo@bwvtc.edu', phone: '13800000001' },
  E001:   { password: 'admin123', name: '王建国', roleId: 'role-president',       email: 'wang.jianguo@bwvtc.edu', phone: '13800000001' },
  E002:   { password: '123456',   name: '李晓梅', roleId: 'role-academic-affairs', email: 'li.xiaomei@bwvtc.edu',   phone: '13800000002' },
  E003:   { password: '123456',   name: '张海波', roleId: 'role-academic-affairs', email: 'zhang.haibo@bwvtc.edu',  phone: '13800000003' },
  E101:   { password: '123456',   name: '张专主', roleId: 'role-pro-director',     email: 'zhang.zhuanzhu@bwvtc.edu', phone: '13800000101' },
  E102:   { password: '123456',   name: '陈专高', roleId: 'role-adv-director',     email: 'chen.zhuangao@bwvtc.edu',  phone: '13800000102' },
  E201:   { password: '123456',   name: '刘专主', roleId: 'role-pro-director',     email: 'liu.zhuanzhu@bwvtc.edu',  phone: '13800000201' },
  E202:   { password: '123456',   name: '赵专高', roleId: 'role-adv-director',     email: 'zhao.zhuangao@bwvtc.edu', phone: '13800000202' },
  // 讲师示例（全栈专业一、云计算专高三）
  T10101: { password: '123456',   name: '王老师', roleId: 'role-lecturer',          email: 'wang.t@bwvtc.edu',        phone: '' },
  T20603: { password: '123456',   name: '谢老师', roleId: 'role-lecturer',          email: 'xie.t1@bwvtc.edu',        phone: '' },
};

// 学生账号（用学号登录）
const studentAccounts: Record<string, { password: string; name: string; email: string; phone: string }> = {
  '2024010101': { password: '123456', name: '林小雨', email: 'lin.xiaoyu@stu.bwvtc.edu',    phone: '' },
  '2024010102': { password: '123456', name: '王大明', email: 'wang.daming@stu.bwvtc.edu',   phone: '' },
  '2023010601': { password: '123456', name: '赵文静', email: 'zhao.wenjing@stu.bwvtc.edu',  phone: '' },
  '2024020201': { password: '123456', name: '陈建平', email: 'chen.jianping@stu.bwvtc.edu', phone: '' },
};

// 学生角色（仅查看权限，按需定制）
const studentPermissions = ['menu-dashboard'];

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: {
    id: 'user-president',
    name: '王建国',
    role: '校长',
    roleId: 'role-president',
    dataScope: 'school',
    email: 'wang.jianguo@bwvtc.edu',
    phone: '13800000001',
    userType: 'staff',
    loginId: 'admin',
  },
  permissions: defaultRole.permissions,
  isAuthenticated: true,

  login: (loginId: string, password: string, userType: UserType) => {
    if (userType === 'student') {
      const account = studentAccounts[loginId];
      if (!account || account.password !== password) return false;
      set({
        currentUser: {
          id: `stu-${loginId}`,
          name: account.name,
          role: '学生',
          roleId: 'role-student',
          dataScope: 'class',
          email: account.email,
          phone: account.phone,
          userType: 'student',
          loginId,
        },
        permissions: studentPermissions,
        isAuthenticated: true,
      });
      return true;
    } else {
      const account = staffAccounts[loginId];
      if (!account || account.password !== password) return false;
      const role = roles.find((r) => r.id === account.roleId);
      if (!role) return false;
      set({
        currentUser: {
          id: `user-${loginId}`,
          name: account.name,
          role: role.name,
          roleId: role.id,
          dataScope: role.dataScope,
          email: account.email,
          phone: account.phone,
          userType: 'staff',
          loginId,
        },
        permissions: role.permissions,
        isAuthenticated: true,
      });
      return true;
    }
  },

  loginAsRole: (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    set({
      currentUser: {
        id: `user-${roleId}`,
        name: role.name,
        role: role.name,
        roleId: role.id,
        dataScope: role.dataScope,
        email: '',
        phone: '',
        userType: 'staff',
        loginId: roleId,
      },
      permissions: role.permissions,
      isAuthenticated: true,
    });
  },

  logout: () =>
    set({ currentUser: null, permissions: [], isAuthenticated: false }),

  hasPermission: (menuId) => get().permissions.includes(menuId),
  hasAnyPermission: (menuIds) =>
    menuIds.some((id) => get().permissions.includes(id)),

  updateProfile: (updates) => {
    const user = get().currentUser;
    if (!user) return;
    set({ currentUser: { ...user, ...updates } });
  },

  updatePassword: (oldPwd: string, _newPwd: string) => {
    if (!oldPwd) return false;
    return true;
  },
}));
