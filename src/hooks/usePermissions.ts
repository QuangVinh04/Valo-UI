import { useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { PermissionKey } from '@/constants/permission.constant';

export function usePermissions() {
  const { hasAnyPermission, hasPermission, permissions } = useAuth();

  const can = useCallback((permission: PermissionKey) => hasPermission(permission), [hasPermission]);
  const cannot = useCallback((permission: PermissionKey) => !hasPermission(permission), [hasPermission]);
  const any = useCallback((items: PermissionKey[]) => hasAnyPermission(items), [hasAnyPermission]);
  const all = useCallback((items: PermissionKey[]) => items.every(hasPermission), [hasPermission]);
  const hasRole = useCallback((role: string) => {
    const normalizedRole = role.trim().toUpperCase();
    return permissions.includes(normalizedRole) || permissions.includes(`ROLE_${normalizedRole}`);
  }, [permissions]);

  return useMemo(() => ({
    permissions,
    can,
    cannot,
    any,
    all,
    hasRole,
  }), [all, any, can, cannot, hasRole, permissions]);
}
