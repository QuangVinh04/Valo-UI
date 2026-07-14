import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

type RequirePermissionProps = {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
};

function RequirePermission({ permission, anyOf, children }: RequirePermissionProps) {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated, permissionsLoading } = useAuth();
  const permissions = usePermissions();

  if (authLoading || permissionsLoading) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>{t('common.checkingAccess')}</h1>
          <p>{t('common.loadingPermissions')}</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const canAccess = anyOf?.length
    ? permissions.any(anyOf)
    : Boolean(permission && permissions.can(permission));

  if (!canAccess) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>{t('common.accessDenied')}</h1>
          <p>{t('common.noPagePermission')}</p>
        </section>
      </div>
    );
  }

  return children;
}

export default RequirePermission;
