import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getAuthUser, type StoredAuthUser } from '@/lib/auth';
import { getCurrentUserPermissions } from '@/services/auth.service';

type AuthContextValue = {
  isAuthenticated: boolean;
  user: StoredAuthUser | null;
  permissions: string[];
  permissionsLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshAuth: () => void;
};

type AuthState = {
  isAuthenticated: boolean;
  user: StoredAuthUser | null;
  permissions: string[];
  permissionsLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAuthState(): AuthState {
  const user = getAuthUser();
  const isAuthenticated = Boolean(localStorage.getItem('accessToken') && user);

  return {
    isAuthenticated,
    user,
    permissions: [],
    permissionsLoading: isAuthenticated,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(readAuthState);
  const isRefreshingPermissionsRef = useRef(false);

  const refreshPermissions = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) {
      setAuthState((current) => ({
        ...current,
        permissions: [],
        permissionsLoading: false,
      }));
      return;
    }

    if (isRefreshingPermissionsRef.current) {
      return;
    }

    isRefreshingPermissionsRef.current = true;
    setAuthState((current) => ({
      ...current,
      permissionsLoading: true,
    }));

    try {
      const permissions = await getCurrentUserPermissions();
      setAuthState((current) => ({
        ...current,
        permissions,
        permissionsLoading: false,
      }));
    } catch {
      setAuthState((current) => ({
        ...current,
        permissions: [],
        permissionsLoading: false,
      }));
    } finally {
      isRefreshingPermissionsRef.current = false;
    }
  }, []);

  const refreshAuth = useCallback(() => {
    setAuthState(readAuthState());
    void refreshPermissions();
  }, [refreshPermissions]);

  useEffect(() => {
    window.addEventListener('storage', refreshAuth);
    window.addEventListener('auth:changed', refreshAuth);

    return () => {
      window.removeEventListener('storage', refreshAuth);
      window.removeEventListener('auth:changed', refreshAuth);
    };
  }, [refreshAuth]);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const value = useMemo<AuthContextValue>(() => {
    const permissionSet = new Set(authState.permissions);

    return {
      ...authState,
      hasPermission: (permission) => permissionSet.has(permission),
      hasAnyPermission: (permissions) => permissions.some((permission) => permissionSet.has(permission)),
      refreshAuth,
    };
  }, [authState, refreshAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
