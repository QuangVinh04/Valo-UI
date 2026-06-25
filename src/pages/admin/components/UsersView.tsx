import { useMemo } from 'react';
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
          <h1>Access denied</h1>
          <p>You do not have permission to view user data.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="management-page">
      <header className="page-hero">
        <div>
          <h1>User Management</h1>
          <p>
            Orchestrate your intelligence network. Manage system permissions, roles,
            and collaborative groups across the Mini AgentHub ecosystem.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn-ghost" type="button" onClick={() => setIsFilterPanelOpen((current) => !current)}>
            <Filter size={17} aria-hidden="true" />
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          <button className="btn-primary" type="button" onClick={openAddModal}>
            <Plus size={17} aria-hidden="true" />
            Add User
          </button>
        </div>
      </header>

      <div className="data-card">
        <div className="bulk-row">
          <label className="check-wrap">
            <input type="checkbox" checked={isAllUsersSelected} onChange={toggleAllUsers} disabled={tableUsers.length === 0} />
            <span>{selectedUserIds.length} users selected</span>
          </label>
          <div>
            <button
              className="btn-ghost"
              type="button"
              onClick={openAssignGroupModal}
              disabled={selectedUserIds.length === 0}
            >
              <UserPlus size={16} aria-hidden="true" />
              Add to Group
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
              Search
              <div className="filter-input-with-icon">
                <Search size={16} aria-hidden="true" />
                <input
                  value={filterDraft.search}
                  placeholder="Name or email"
                  onChange={(event) => setFilterDraft((current) => ({ ...current, search: event.target.value }))}
                />
              </div>
            </label>
            <label>
              Group
              <select
                value={filterDraft.groupId}
                onChange={(event) => setFilterDraft((current) => ({ ...current, groupId: event.target.value }))}
              >
                <option value="">All groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <label>
              Password State
              <select
                value={filterDraft.mustChangePassword}
                onChange={(event) => setFilterDraft((current) => ({
                  ...current,
                  mustChangePassword: event.target.value as UserFilters['mustChangePassword'],
                }))}
              >
                <option value="all">All users</option>
                <option value="true">Must change password</option>
                <option value="false">Password changed</option>
              </select>
            </label>
            <div className="filter-actions">
              <button className="btn-cancel flat" type="button" onClick={clearFilters}>
                <RotateCcw size={16} aria-hidden="true" />
                Clear
              </button>
              <button className="btn-primary" type="button" onClick={applyFilters}>
                <Filter size={16} aria-hidden="true" />
                Apply
              </button>
            </div>
          </div>
        )}

        {isLoading && <div className="state-row">Loading users from backend...</div>}

        <table className="data-table users-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
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
                <td><span className="role-pill">{user.role}</span></td>
                <td>
                  <div className="row-actions">
                    <IconButton icon={Eye} label={`View ${user.fullName}`} onClick={() => openUserModal('details', user)} disabled={openingUserId === user.id} />
                    <IconButton icon={Trash2} label={`Delete ${user.fullName}`} onClick={() => openUserModal('delete', user)} disabled={openingUserId === user.id} />
                    <IconButton icon={Pencil} label={`Update ${user.fullName}`} onClick={() => openUserModal('update', user)} disabled={openingUserId === user.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tableUsers.length === 0 && (
          <div className="empty-state">
            <Plus size={28} aria-hidden="true" />
            <h3>No users found</h3>
            <p>Create a user or adjust filters to populate this workspace.</p>
          </div>
        )}

        <footer className="table-footer">
          <span>Showing {showingFrom} to {showingTo} of {totalItems} nodes</span>
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
