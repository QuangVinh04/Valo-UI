import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '@/styles/pages/management.css';

type RequirePermissionProps = {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
};

function RequirePermission({ permission, anyOf, children }: RequirePermissionProps) {
  const { hasAnyPermission, hasPermission, isAuthenticated, permissionsLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (permissionsLoading) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>Checking access</h1>
          <p>Loading your permissions...</p>
        </section>
      </div>
    );
  }

  const canAccess = anyOf?.length
    ? hasAnyPermission(anyOf)
    : Boolean(permission && hasPermission(permission));

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
