import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Filter, Pencil, Plus, RotateCcw, Search, Trash2, UserPlus } from 'lucide-react';
import ActionIconButton from '@/components/common/ActionIconButton';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import { type UserFilters, useUsers } from '@/hooks/useUsers';
import '@/styles/pages/management.css';
import UserAssignGroupModal from './users/UserAssignGroupModal';
import UserDeleteModal from './users/UserDeleteModal';
import UserDetailsModal from './users/UserDetailsModal';
import UserFormModal from './users/UserFormModal';
import { toUserTableItem, type UserTableItem } from './users/user-view-model';

function UsersView() {
  const { t } = useTranslation();
  const usersState = useUsers();
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [isConfirmingDeleteSelected, setIsConfirmingDeleteSelected] = useState(false);
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
    isDeletingSelectedUsers,
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
    deleteSelectedUsers,
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
  const hasSelectedUsers = selectedUserIds.length > 0;
  const activeFilterCount = [
    activeFilters.search.trim(),
    activeFilters.groupId,
    activeFilters.status !== 'all' ? activeFilters.status : '',
  ].filter(Boolean).length;

  useEffect(() => {
    if (!selectAllRef.current) return;

    selectAllRef.current.indeterminate = hasSelectedUsers && !isAllUsersSelected;
  }, [hasSelectedUsers, isAllUsersSelected]);

  async function handleConfirmDeleteSelected() {
    await deleteSelectedUsers();
    setIsConfirmingDeleteSelected(false);
  }

  const userTableColumns: Array<DataTableColumn<UserTableItem>> = [
    {
      key: 'select',
      header: (
        <label className="table-select-check">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={isAllUsersSelected}
            onChange={toggleAllUsers}
            disabled={tableUsers.length === 0}
          />
          <span className="sr-only">{t('admin.users.usersSelected', { count: selectedUserIds.length })}</span>
        </label>
      ),
      className: 'table-column-select',
      render: (user) => (
        <label className="table-select-check">
          <input
            type="checkbox"
            checked={selectedUserIds.includes(user.id)}
            onChange={() => toggleSelectedUser(user.id)}
          />
          <span className="sr-only">{user.fullName}</span>
        </label>
      ),
    },
    {
      key: 'name',
      header: t('common.name'),
      className: 'table-column-primary',
      render: (user) => (
        <div className="user-cell">
          <span className={`avatar avatar-${user.initials.toLowerCase()}`}>{user.initials}</span>
          <strong>{user.fullName}</strong>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('common.email'),
      className: 'table-column-secondary',
      render: (user) => user.email,
    },
    {
      key: 'role',
      header: t('admin.users.role'),
      className: 'table-column-tertiary',
      render: (user) => (
        user.groups.length > 0 ? <span className="role-pill">{user.role}</span> : null
      ),
    },
    {
      key: 'spacer',
      header: null,
      className: 'table-column-spacer',
      render: () => null,
    },
    {
      key: 'status',
      header: t('admin.users.status'),
      className: 'table-column-status',
      render: (user) => (
        <span className={`status-pill ${user.active ? 'status-active' : 'status-inactive'}`}>
          {user.active ? t('admin.users.active') : t('admin.users.inactive')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'table-column-actions',
      render: (user) => (
        <div className="row-actions">
          <IconButton icon={Eye} label={t('admin.users.viewUser', { name: user.fullName })} onClick={() => openUserModal('details', user)} disabled={openingUserId === user.id} />
          <IconButton icon={Pencil} label={t('admin.users.updateUser', { name: user.fullName })} onClick={() => openUserModal('update', user)} disabled={openingUserId === user.id} />
          <IconButton icon={Trash2} label={t('admin.users.deleteUser', { name: user.fullName })} onClick={() => openUserModal('delete', user)} disabled={openingUserId === user.id} />
        </div>
      ),
    },
  ];

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
      </header>

      <div className="data-card">
        <div className={`bulk-row table-action-bar ${hasSelectedUsers ? 'selection-actions' : ''}`}>
          {hasSelectedUsers ? (
            <>
              <span>{t('admin.users.usersSelected', { count: selectedUserIds.length })}</span>
              <ActionIconButton
                icon={Trash2}
                label={t('common.delete')}
                variant="danger"
                onClick={() => setIsConfirmingDeleteSelected(true)}
                disabled={isDeletingSelectedUsers}
                isLoading={isDeletingSelectedUsers}
              />
              <ActionIconButton
                icon={UserPlus}
                label={t('common.add')}
                onClick={openAssignGroupModal}
                disabled={isDeletingSelectedUsers}
              />
            </>
          ) : (
            <div className="table-action-buttons">
              <ActionIconButton
                icon={Filter}
                label={t('admin.users.filter')}
                onClick={() => setIsFilterPanelOpen((current) => !current)}
                badge={activeFilterCount > 0 ? activeFilterCount : undefined}
              />
              <ActionIconButton
                icon={Plus}
                label={t('admin.users.addUser')}
                variant="primary"
                onClick={openAddModal}
              />
            </div>
          )}
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
              {t('admin.users.status')}
              <select
                value={filterDraft.status}
                onChange={(event) => setFilterDraft((current) => ({
                  ...current,
                  status: event.target.value as UserFilters['status'],
                }))}
              >
                <option value="all">{t('admin.users.allUsers')}</option>
                <option value="active">{t('admin.users.active')}</option>
                <option value="inactive">{t('admin.users.inactive')}</option>
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

        <div className={`data-table-body ${!isLoading && tableUsers.length === 0 ? 'is-empty' : ''}`}>
          <DataTable
            className="users-table"
            columns={userTableColumns}
            data={tableUsers}
            getRowKey={(user) => user.id}
            getRowClassName={(user) => (selectedUserIds.includes(user.id) ? 'selected' : undefined)}
          />
          {!isLoading && tableUsers.length === 0 && (
            <div className="empty-state">
              <Plus size={28} aria-hidden="true" />
              <h3>{t('admin.users.noUsersFound')}</h3>
              <p>{t('admin.users.noUsersDescription')}</p>
            </div>
          )}
        </div>

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
      {isConfirmingDeleteSelected && (
        <Modal
          className="modal-card compact-modal"
          labelledBy="delete-selected-users-title"
          describedBy="delete-selected-users-description"
          isDismissDisabled={isDeletingSelectedUsers}
          onClose={() => setIsConfirmingDeleteSelected(false)}
        >
            <header className="modal-header">
              <h2 id="delete-selected-users-title">{t('admin.users.deleteSelectedTitle')}</h2>
              <button
                type="button"
                aria-label={t('admin.users.closeDeleteSelected')}
                onClick={() => setIsConfirmingDeleteSelected(false)}
                disabled={isDeletingSelectedUsers}
              >
                ×
              </button>
            </header>
            <div className="modal-body">
              <p className="confirm-description" id="delete-selected-users-description">
                {t('admin.users.deleteSelectedDescription', { count: selectedUserIds.length })}
              </p>
            </div>
            <footer className="modal-footer">
              <button
                className="btn-muted"
                type="button"
                onClick={() => setIsConfirmingDeleteSelected(false)}
                disabled={isDeletingSelectedUsers}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn-solid-danger"
                type="button"
                onClick={() => void handleConfirmDeleteSelected()}
                disabled={isDeletingSelectedUsers}
              >
                {isDeletingSelectedUsers ? t('common.deleting') : t('common.delete')}
              </button>
            </footer>
        </Modal>
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
