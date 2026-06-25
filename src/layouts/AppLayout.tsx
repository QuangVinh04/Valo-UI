import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Settings, Shield, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/hooks/useChat';
import { usePermissions } from '@/hooks/usePermissions';
import ChatSidebarRecents from '@/pages/chat/components/ChatSidebarRecents';
import '@/styles/layout.css';

const navItems = [
  { to: '/chat', icon: MessageSquare, labelKey: 'layout.nav.chat' },
  { to: '/users', icon: Users, labelKey: 'layout.nav.users' },
  { to: '/groups', icon: Shield, labelKey: 'layout.nav.groups' },
  { to: '/settings', icon: Settings, labelKey: 'layout.nav.settings' },
];

function AppLayout() {
  const { authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <ChatProvider>
      <AppLayoutContent />
    </ChatProvider>
  );
}

function AppLayoutContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const location = useLocation();
  const chat = useChat();
  const isChatRoute = location.pathname.startsWith('/chat');
  const loginUsername = user?.fullName || user?.email || t('layout.role');
  const avatarInitial = loginUsername.trim().charAt(0).toUpperCase() || 'U';
  const visibleNavItems = navItems.filter((item) => {
    if (item.to === '/users') {
      return permissions.any(['USER_R']);
    }

    if (item.to === '/groups') {
      return permissions.any(['GROUP_R']);
    }

    return true;
  });

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2 className="sidebar-title">Agent Hub</h2>
          <p>{t('layout.workspace')}</p>
        </div>
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => {
                const shouldShowActive = item.to === '/chat'
                  ? isActive && !chat.activeConversationId
                  : isActive;

                return shouldShowActive ? 'active' : undefined;
              }}
              onClick={() => {
                if (item.to === '/chat') {
                  chat.startNewChat();
                }
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                <item.icon size={20} strokeWidth={2} />
              </span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <ChatSidebarRecents />
        <div className="sidebar-user">
          <div className="sidebar-avatar">{avatarInitial}</div>
          <div>
            <strong>{loginUsername}</strong>
            <span>{t('layout.role')}</span>
          </div>
        </div>
      </aside>
      <section className={isChatRoute ? 'content content-chat' : 'content'}>
        <Outlet />
      </section>
    </div>
  );
}

export default AppLayout;
