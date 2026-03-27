import axios, { AxiosError } from 'axios';

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  timestamp: string;
  totalActive?: number;
}

export interface PageData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

const TOKEN_STORAGE_KEY = 'bw-ai-check.token';
const USER_STORAGE_KEY = 'bw-ai-check.current-user';
const PERMISSIONS_STORAGE_KEY = 'bw-ai-check.permissions';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse<unknown>;
    if (typeof payload?.code === 'number' && payload.code !== 0) {
      return Promise.reject(new Error(payload.message || '请求失败'));
    }
    return response;
  },
  (error: AxiosError<{ message?: string }>) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      '网络请求失败';
    return Promise.reject(new Error(message));
  },
);

export function unwrap<T>(payload: ApiResponse<T>): T {
  return payload.data;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function persistSession<UserType>(user: UserType, permissions: string[]) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
}

export function restoreSession<UserType>() {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  const rawPermissions = localStorage.getItem(PERMISSIONS_STORAGE_KEY);

  return {
    user: rawUser ? (JSON.parse(rawUser) as UserType) : null,
    permissions: rawPermissions ? (JSON.parse(rawPermissions) as string[]) : [],
  };
}

export function clearPersistedSession() {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
  clearStoredToken();
}
