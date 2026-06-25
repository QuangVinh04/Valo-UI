import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Filter, Pencil, Plus, RotateCcw, Search, Trash2, UserPlus } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { type UserFilters, useUsers } from '@/hooks/useUsers';
import '@/styles/pages/management.css';
import UserAssignGroupModal from './users/UserAssignGroupModal';
import UserDeleteModal from './users/UserDeleteModal';
import UserDetailsModal from './users/UserDetailsModal';
import UserFormModal from './users/UserFormModal';
import { toUserTableItem } from './users/user-view-model';

function UsersView() {
  const { t } = useTranslation();
  const usersState = useUsers();
  const {
    modal,
    selectedUser,
    users,
    groups,
    totalItems,
    page,
    limit,
    totalPages,
    isLoading,
    selectedUserIds,
    openingUserId,
    isFilterPanelOpen,
    filterDraft,
    activeFilters,
    canReadUsers,
    setIsFilterPanelOpen,
    setFilterDraft,
    loadUsers,
    openAddModal,
    openAssignGroupModal,
    openUserModal,
    closeModal,
    goToPage,
    toggleSelectedUser,
    toggleAllUsers: toggleAllUsersSelection,
    applyFilters,
    clearFilters,
  } = usersState;

  const tableUsers = useMemo(() => {
    if (!canReadUsers) {
      return [];
    }

    return users.map(toUserTableItem);
  }, [canReadUsers, users]);

  function toggleAllUsers() {
    // Chọn hoặc bỏ chọn toàn bộ người dùng đang hiển thị trên trang hiện tại.
    toggleAllUsersSelection(tableUsers.map((user) => user.id));
  }

  const showingFrom = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);
  const isAllUsersSelected = tableUsers.length > 0 && selectedUserIds.length === tableUsers.length;
  const activeFilterCount = [
    activeFilters.search.trim(),
    activeFilters.groupId,
    activeFilters.mustChangePassword !== 'all' ? activeFilters.mustChangePassword : '',
  ].filter(Boolean).length;

  if (!canReadUsers) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>{t('common.accessDenied')}</h1>
          <p>{t('admin.users.accessDeniedDescription')}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="management-page">
      <header className="page-hero">
        <div>
          <h1>{t('admin.users.pageTitle')}</h1>
          <p>
            {t('admin.users.pageDescription')}
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn-ghost" type="button" onClick={() => setIsFilterPanelOpen((current) => !current)}>
            <Filter size={17} aria-hidden="true" />
            {t('admin.users.filter')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button className="btn-primary" type="button" onClick={openAddModal}>
            <Plus size={17} aria-hidden="true" />
            {t('admin.users.addUser')}
          </button>
        </div>
      </header>

      <div className="data-card">
        <div className="bulk-row">
          <label className="check-wrap">
            <input type="checkbox" checked={isAllUsersSelected} onChange={toggleAllUsers} disabled={tableUsers.length === 0} />
            <span>{t('admin.users.usersSelected', { count: selectedUserIds.length })}</span>
          </label>
          <div>
            <button
              className="btn-ghost"
              type="button"
              onClick={openAssignGroupModal}
              disabled={selectedUserIds.length === 0}
            >
              <UserPlus size={16} aria-hidden="true" />
              {t('admin.users.addToGroup')}
            </button>
          </div>
          {/* <div>
            <button
              className="btn-danger-link"
              type="button"
              onClick={() => showPermissionNotice('USER_D')}
              disabled={selectedUserIds.length === 0}
            >
              Delete Selected
            </button>
          </div> */}
        </div>

        {isFilterPanelOpen && (
          <div className="filter-panel">
            <label>
              {t('common.search')}
              <div className="filter-input-with-icon">
                <Search size={16} aria-hidden="true" />
                <input
                  value={filterDraft.search}
                  placeholder={t('admin.users.searchPlaceholder')}
                  onChange={(event) => setFilterDraft((current) => ({ ...current, search: event.target.value }))}
                />
              </div>
            </label>
            <label>
              {t('common.group')}
              <select
                value={filterDraft.groupId}
                onChange={(event) => setFilterDraft((current) => ({ ...current, groupId: event.target.value }))}
              >
                <option value="">{t('admin.users.allGroups')}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.users.passwordState')}
              <select
                value={filterDraft.mustChangePassword}
                onChange={(event) => setFilterDraft((current) => ({
                  ...current,
                  mustChangePassword: event.target.value as UserFilters['mustChangePassword'],
                }))}
              >
                <option value="all">{t('admin.users.allUsers')}</option>
                <option value="true">{t('admin.users.mustChangePassword')}</option>
                <option value="false">{t('admin.users.passwordChanged')}</option>
              </select>
            </label>
            <div className="filter-actions">
              <button className="btn-cancel flat" type="button" onClick={clearFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                {t('common.clear')}
              </button>
              <button className="btn-primary" type="button" onClick={applyFilters}>
                <Filter size={16} aria-hidden="true" />
                {t('common.apply')}
              </button>
            </div>
          </div>
        )}

        {isLoading && <div className="state-row">{t('admin.users.loadingUsers')}</div>}

        <table className="data-table users-table">
          <thead>
            <tr><th>{t('common.name')}</th><th>{t('common.email')}</th><th>{t('admin.users.role')}</th><th>{t('common.actions')}</th></tr>
          </thead>
          <tbody>
            {tableUsers.map((user) => (
              <tr className={selectedUserIds.includes(user.id) ? 'selected' : undefined} key={user.id}>
                <td>
                  <div className="user-cell">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleSelectedUser(user.id)}
                    />
                    <span className={`avatar avatar-${user.initials.toLowerCase()}`}>{user.initials}</span>
                    <strong>{user.fullName}</strong>
                  </div>
                </td>
                <td>{user.email}</td>
                <td><span className="role-pill">{user.groups.length ? user.role : t('admin.users.noGroup')}</span></td>
                <td>
                  <div className="row-actions">
                    <IconButton icon={Eye} label={t('admin.users.viewUser', { name: user.fullName })} onClick={() => openUserModal('details', user)} disabled={openingUserId === user.id} />
                    <IconButton icon={Trash2} label={t('admin.users.deleteUser', { name: user.fullName })} onClick={() => openUserModal('delete', user)} disabled={openingUserId === user.id} />
                    <IconButton icon={Pencil} label={t('admin.users.updateUser', { name: user.fullName })} onClick={() => openUserModal('update', user)} disabled={openingUserId === user.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tableUsers.length === 0 && (
          <div className="empty-state">
            <Plus size={28} aria-hidden="true" />
            <h3>{t('admin.users.noUsersFound')}</h3>
            <p>{t('admin.users.noUsersDescription')}</p>
          </div>
        )}

        <footer className="table-footer">
          <span>{t('admin.users.showing', { from: showingFrom, to: showingTo, total: totalItems })}</span>
          <div className="pagination">
            <button type="button" disabled={page <= 1 || isLoading} onClick={() => goToPage(page - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                type="button"
                className={pageNumber === page ? 'active' : ''}
                key={pageNumber}
                disabled={isLoading}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" disabled={page >= totalPages || isLoading} onClick={() => goToPage(page + 1)}>›</button>
          </div>
        </footer>
      </div>

      {modal === 'details' && selectedUser && <UserDetailsModal user={selectedUser} onClose={closeModal} />}
      {modal === 'add' && (
        <UserFormModal mode="add" groups={groups} onClose={closeModal} onSaved={() => loadUsers(1)} />
      )}
      {modal === 'update' && selectedUser && (
        <UserFormModal mode="update" user={selectedUser} groups={groups} onClose={closeModal} onSaved={() => loadUsers(page)} />
      )}
      {modal === 'delete' && selectedUser && (
        <UserDeleteModal user={selectedUser} onClose={closeModal} onDeleted={() => loadUsers(page)} />
      )}
      {modal === 'assignGroup' && (
        <UserAssignGroupModal
          groups={groups}
          userIds={selectedUserIds}
          onClose={closeModal}
          onAssigned={() => loadUsers(page)}
        />
      )}
    </div>
  );
}

export default UsersView;
