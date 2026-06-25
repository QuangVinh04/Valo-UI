import { useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export function usePermissions() {
  const { hasAnyPermission, hasPermission, permissions } = useAuth();

  const can = useCallback((permission: string) => hasPermission(permission), [hasPermission]);
  const cannot = useCallback((permission: string) => !hasPermission(permission), [hasPermission]);
  const any = useCallback((items: string[]) => hasAnyPermission(items), [hasAnyPermission]);
  const all = useCallback((items: string[]) => items.every(hasPermission), [hasPermission]);
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
