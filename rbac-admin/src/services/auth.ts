import { http, persistSession, restoreSession, setStoredToken, unwrap, clearPersistedSession } from './http';
import type { DataScope, UserType } from '../types/rbac';

interface LoginRequest {
  loginId: string;
  password: string;
  userType: UserType;
}

interface BackendAuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  userType: UserType;
  loginId: string;
  roleIds: string[];
  roleName: string;
  dataScope: DataScope;
  classId?: string | null;
  className?: string | null;
}

interface LoginResponse {
  token: string;
  user: BackendAuthUser;
  permissions: string[];
}

interface CurrentSessionResponse {
  user: BackendAuthUser;
  permissions: string[];
}

export interface CurrentUser {
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
  classId?: string;
  className?: string;
}

function normalizeCurrentUser(user: CurrentUser): CurrentUser {
  if (user.userType !== 'student') {
    return user;
  }

  return {
    ...user,
    role: '学生',
    roleId: 'role-student',
  };
}

function mapCurrentUser(user: BackendAuthUser): CurrentUser {
  return normalizeCurrentUser({
    id: user.id,
    name: user.name,
    role: user.roleName,
    roleId: user.roleIds[0] || '',
    avatar: user.avatar || undefined,
    dataScope: user.dataScope,
    email: user.email,
    phone: '',
    userType: user.userType,
    loginId: user.loginId,
    classId: user.classId ?? undefined,
    className: user.className ?? undefined,
  });
}

export async function login(payload: LoginRequest) {
  const response = await http.post('/auth/login', payload);
  const data = unwrap<LoginResponse>(response.data);
  const currentUser = mapCurrentUser(data.user);

  setStoredToken(data.token);
  persistSession(currentUser, data.permissions);

  return {
    token: data.token,
    currentUser,
    permissions: data.permissions,
  };
}

export async function fetchCurrentUser() {
  const response = await http.get('/auth/me');
  const data = unwrap<CurrentSessionResponse>(response.data);
  return {
    currentUser: mapCurrentUser(data.user),
    permissions: data.permissions,
  };
}

export async function logout() {
  try {
    await http.post('/auth/logout');
  } finally {
    clearPersistedSession();
  }
}

export function getRestoredAuthState() {
  const restored = restoreSession<CurrentUser>();
  return {
    ...restored,
    user: restored.user ? normalizeCurrentUser(restored.user) : null,
  };
}
