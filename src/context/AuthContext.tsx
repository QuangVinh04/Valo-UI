import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clearAuthState, getAuthUser, storeAuthUser, type StoredAuthUser } from '@/lib/auth';
import { getCurrentUserPermissions } from '@/services/auth.service';
import { getCurrentUser } from '@/services/user.service';

type AuthContextValue = {
  isAuthenticated: boolean;
  authLoading: boolean;
  user: StoredAuthUser | null;
  permissions: string[];
  permissionsLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshAuth: () => void;
};

type AuthState = {
  isAuthenticated: boolean;
  authLoading: boolean;
  user: StoredAuthUser | null;
  permissions: string[];
  permissionsLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAuthState(): AuthState {
  const hasAccessToken = Boolean(localStorage.getItem('accessToken'));
  const user = getAuthUser();

  return {
    isAuthenticated: false,
    authLoading: hasAccessToken,
    user,
    permissions: [],
    permissionsLoading: hasAccessToken,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(readAuthState);
  const hydrateRequestIdRef = useRef(0);

  const hydrateAuth = useCallback(async () => {
    const requestId = hydrateRequestIdRef.current + 1;
    hydrateRequestIdRef.current = requestId;

    if (!localStorage.getItem('accessToken')) {
      setAuthState((current) => ({
        ...current,
        isAuthenticated: false,
        authLoading: false,
        user: null,
        permissions: [],
        permissionsLoading: false,
      }));
      return;
    }

    setAuthState((current) => ({
      ...current,
      isAuthenticated: false,
      authLoading: true,
      permissionsLoading: true,
    }));

    try {
      const currentUser = await getCurrentUser();
      const permissions = await getCurrentUserPermissions().catch(() => []);

      if (hydrateRequestIdRef.current !== requestId) {
        return;
      }

      const user = {
        fullName: currentUser.fullName,
        email: currentUser.email,
      };

      storeAuthUser(user);
      setAuthState((current) => ({
        ...current,
        isAuthenticated: true,
        authLoading: false,
        user,
        permissions,
        permissionsLoading: false,
      }));
    } catch {
      if (hydrateRequestIdRef.current !== requestId) {
        return;
      }

      clearAuthState();
      setAuthState({
        isAuthenticated: false,
        authLoading: false,
        user: null,
        permissions: [],
        permissionsLoading: false,
      });
    }
  }, []);

  const refreshAuth = useCallback(() => {
    setAuthState(readAuthState());
    void hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    window.addEventListener('storage', refreshAuth);
    window.addEventListener('auth:changed', refreshAuth);

    return () => {
      window.removeEventListener('storage', refreshAuth);
      window.removeEventListener('auth:changed', refreshAuth);
    };
  }, [refreshAuth]);

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

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
