import '@/styles/pages/dashboard.css';
import { MessageSquare, Shield, Users } from 'lucide-react';

function DashboardPage() {
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="form-kicker">Operations</p>
          <h1 className="page-title">Dashboard</h1>
          <p>Workspace health, access footprint, and activity summary.</p>
        </div>
      </header>
      <div className="grid-cards">
        <article className="dashboard-panel">
          <span><Users size={18} aria-hidden="true" /></span>
          <h3>Total Users</h3>
          <p>1,284</p>
        </article>
        <article className="dashboard-panel">
          <span><Shield size={18} aria-hidden="true" /></span>
          <h3>Total Groups</h3>
          <p>36</p>
        </article>
        <article className="dashboard-panel">
          <span><MessageSquare size={18} aria-hidden="true" /></span>
          <h3>Messages Today</h3>
          <p>9,412</p>
        </article>
      </div>
    </div>
  );
}

export default DashboardPage;
