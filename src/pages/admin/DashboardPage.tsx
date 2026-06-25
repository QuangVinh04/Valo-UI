import '@/styles/pages/dashboard.css';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Shield, Users } from 'lucide-react';

function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="form-kicker">{t('admin.dashboard.operations')}</p>
          <h1 className="page-title">{t('admin.dashboard.title')}</h1>
          <p>{t('admin.dashboard.description')}</p>
        </div>
      </header>
      <div className="grid-cards">
        <article className="dashboard-panel">
          <span><Users size={18} aria-hidden="true" /></span>
          <h3>{t('admin.dashboard.totalUsers')}</h3>
          <p>1,284</p>
        </article>
        <article className="dashboard-panel">
          <span><Shield size={18} aria-hidden="true" /></span>
          <h3>{t('admin.dashboard.totalGroups')}</h3>
          <p>36</p>
        </article>
        <article className="dashboard-panel">
          <span><MessageSquare size={18} aria-hidden="true" /></span>
          <h3>{t('admin.dashboard.messagesToday')}</h3>
          <p>9,412</p>
        </article>
      </div>
    </div>
  );
}

export default DashboardPage;
