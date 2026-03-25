import { useCallback, useMemo } from 'react';
import type { DataScope } from '../types/rbac';
import { useAuthStore } from '../stores/authStore';

interface UsePermissionReturn {
  /** Check if current user has a specific permission */
  hasPermission: (code: string) => boolean;
  /** Check if current user has at least one of the given permissions */
  hasAnyPermission: (codes: string[]) => boolean;
  /** Check if current user has all of the given permissions */
  hasAllPermissions: (codes: string[]) => boolean;
  /** Current user's data scope */
  dataScope: DataScope | null;
}

export function usePermission(): UsePermissionReturn {
  const permissions = useAuthStore((s) => s.permissions);
  const currentUser = useAuthStore((s) => s.currentUser);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const hasPermission = useCallback(
    (code: string) => permissionSet.has(code),
    [permissionSet],
  );

  const hasAnyPermission = useCallback(
    (codes: string[]) => codes.some((code) => permissionSet.has(code)),
    [permissionSet],
  );

  const hasAllPermissions = useCallback(
    (codes: string[]) => codes.every((code) => permissionSet.has(code)),
    [permissionSet],
  );

  const dataScope = currentUser?.dataScope ?? null;

  return { hasPermission, hasAnyPermission, hasAllPermissions, dataScope };
}
