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
}

interface LoginResponse {
  token: string;
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
}

function mapCurrentUser(user: BackendAuthUser): CurrentUser {
  return {
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
  };
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
  const data = unwrap<BackendAuthUser>(response.data);
  return mapCurrentUser(data);
}

export async function logout() {
  try {
    await http.post('/auth/logout');
  } finally {
    clearPersistedSession();
  }
}

export function getRestoredAuthState() {
  return restoreSession<CurrentUser>();
}
