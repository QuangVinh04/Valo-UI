import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import '@/styles/pages/management.css';

type RequirePermissionProps = {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
};

function RequirePermission({ permission, anyOf, children }: RequirePermissionProps) {
  const { authLoading, isAuthenticated, permissionsLoading } = useAuth();
  const permissions = usePermissions();

  if (authLoading || permissionsLoading) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>Checking access</h1>
          <p>Loading your permissions...</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const canAccess = anyOf?.length
    ? permissions.any(anyOf)
    : Boolean(permission && permissions.can(permission));

  if (!canAccess) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>Access denied</h1>
          <p>You do not have permission to open this page.</p>
        </section>
      </div>
    );
  }

  return children;
}

export default RequirePermission;
