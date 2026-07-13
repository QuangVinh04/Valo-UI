import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, PanelLeft, Search, Settings, Shield, SquarePen, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/hooks/useChat';
import { usePermissions } from '@/hooks/usePermissions';
import ChatSidebarRecents from '@/pages/chat/components/ChatSidebarRecents';
import SearchConversationsModal from '@/pages/chat/components/SearchConversationsModal';
import '@/styles/layout.css';

const navItems = [
  { to: '/users', icon: Users, labelKey: 'layout.nav.users' },
  { to: '/groups', icon: Shield, labelKey: 'layout.nav.groups' },
  { to: '/settings', icon: Settings, labelKey: 'layout.nav.settings' },
];

function AppLayout() {
  const { t } = useTranslation();
  const { authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        {t('layout.checkingSession')}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ChatProvider>
      <AppLayoutContent />
    </ChatProvider>
  );
}

function AppLayoutContent() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();
  const permissions = usePermissions();
  const location = useLocation();
  const chat = useChat();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true',
  );
  const [isConversationSearchOpen, setIsConversationSearchOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isChatRoute = location.pathname.startsWith('/chat');
  const accountDisplayName = user?.fullName || user?.email || t('common.user');
  const accountEmail = user?.email || t('common.email');
  const avatarInitial = accountDisplayName.trim().charAt(0).toUpperCase() || 'U';
  const visibleNavItems = navItems.filter((item) => {
    if (item.to === '/users') {
      return permissions.any(['USER_R']);
    }

    if (item.to === '/groups') {
      return permissions.any(['GROUP_R']);
    }

    return true;
  });
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <h2 className="sidebar-title">{t('layout.brand')}</h2>
            <p>{t('layout.workspace')}</p>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            aria-pressed={isSidebarCollapsed}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            <PanelLeft size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="sidebar-primary-actions">
          <button type="button" onClick={chat.startNewChat}>
            <SquarePen size={19} aria-hidden="true" />
            <span>{t('chat.newConversation')}</span>
          </button>
          <button type="button" onClick={() => setIsConversationSearchOpen(true)}>
            <Search size={19} aria-hidden="true" />
            <span>{t('chat.searchConversations')}</span>
          </button>
        </div>
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'active' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                <item.icon size={20} strokeWidth={2} />
              </span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <ChatSidebarRecents />
        <div className="sidebar-account" ref={accountMenuRef}>
          {isAccountMenuOpen && (
            <div className="account-menu" role="menu">
              <p className="account-menu-email">{accountEmail}</p>
              <button
                type="button"
                className="account-menu-action"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>{t('settings.signOut')}</span>
              </button>
            </div>
          )}
          <button
            type="button"
            className="sidebar-user"
            aria-haspopup="menu"
            aria-expanded={isAccountMenuOpen}
            aria-label={accountDisplayName}
            title={accountDisplayName}
            onClick={() => setIsAccountMenuOpen((current) => !current)}
          >
            <span className="sidebar-avatar" aria-hidden="true">{avatarInitial}</span>
            <span className="sidebar-user-copy">
              <strong>{accountDisplayName}</strong>
            </span>
          </button>
        </div>
      </aside>
      <section className={isChatRoute ? 'content content-chat' : 'content'}>
        <Outlet />
      </section>
      {isConversationSearchOpen && (
        <SearchConversationsModal onClose={() => setIsConversationSearchOpen(false)} />
      )}
    </div>
  );
}

export default AppLayout;
