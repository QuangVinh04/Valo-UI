import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Filter, Pencil, Plus, RotateCcw, Search, Trash2, UserPlus } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getGroups, type GroupListItemDto } from '@/services/group.service';
import { getUserById, getUsers, type UserDto, type UserListItemDto } from '@/services/user.service';
import '@/styles/pages/management.css';
import UserAssignGroupModal from './users/UserAssignGroupModal';
import UserDeleteModal from './users/UserDeleteModal';
import UserDetailsModal from './users/UserDetailsModal';
import UserFormModal from './users/UserFormModal';
import { toUserTableItem } from './users/user-view-model';

type UserModalAction = 'details' | 'add' | 'update' | 'delete' | 'assignGroup';

const userActionPermissions: Record<Exclude<UserModalAction, 'details'>, string> = {
  add: 'USER_C',
  update: 'USER_U',
  delete: 'USER_D',
  assignGroup: 'USER_U',
};

const permissionMessages: Record<string, string> = {
  USER_R: 'You do not have permission to view user details.',
  USER_C: 'You do not have permission to create users.',
  USER_U: 'You do not have permission to update users.',
  USER_D: 'You do not have permission to delete users.',
};

type UserFilters = {
  search: string;
  groupId: string;
  mustChangePassword: 'all' | 'true' | 'false';
};

const defaultFilters: UserFilters = {
  search: '',
  groupId: '',
  mustChangePassword: 'all',
};

function UsersView() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canReadUsers = hasPermission('USER_R');
  const [modal, setModal] = useState<UserModalAction | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [users, setUsers] = useState<UserListItemDto[]>([]);
  const [groups, setGroups] = useState<GroupListItemDto[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<UserFilters>(defaultFilters);
  const [activeFilters, setActiveFilters] = useState<UserFilters>(defaultFilters);

  const userQueryFilters = useMemo(() => ({
    search: activeFilters.search.trim() || undefined,
    groupId: activeFilters.groupId || undefined,
    mustChangePassword: activeFilters.mustChangePassword === 'all'
      ? undefined
      : activeFilters.mustChangePassword === 'true',
  }), [activeFilters]);

  const loadUsers = useCallback(async (targetPage = page) => {
    if (!hasPermission('USER_R')) {
      setUsers([]);
      setTotalItems(0);
      setTotalPages(1);
      toast.warning('You can open User Management, but you do not have permission to view user data.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await getUsers(targetPage, limit, userQueryFilters);
      setUsers(result.users);
      setSelectedUserIds([]);
      setTotalItems(result.meta?.totalItems ?? result.users.length);
      setTotalPages(result.meta?.totalPages ?? 1);
      setPage(result.meta?.page ?? targetPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot load users');
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission, limit, page, toast, userQueryFilters]);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      if (!hasPermission('USER_R')) {
        setUsers([]);
        setTotalItems(0);
        setTotalPages(1);
        toast.warning('You can open User Management, but you do not have permission to view user data.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [userResult, groupResult] = await Promise.all([
          getUsers(page, limit, userQueryFilters),
          getGroups().catch(() => [] as GroupListItemDto[]),
        ]);

        if (!ignore) {
          setUsers(userResult.users);
          setSelectedUserIds([]);
          setTotalItems(userResult.meta?.totalItems ?? userResult.users.length);
          setTotalPages(userResult.meta?.totalPages ?? 1);
          setPage(userResult.meta?.page ?? page);
          setGroups(groupResult);
        }
      } catch (err) {
        if (!ignore) {
          toast.error(err instanceof Error ? err.message : 'Cannot load users');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [hasPermission, limit, page, toast, userQueryFilters]);

  const tableUsers = useMemo(() => {
    if (!canReadUsers) {
      return [];
    }

    return users.map(toUserTableItem);
  }, [canReadUsers, users]);

  function showPermissionNotice(permission: string) {
    toast.warning(permissionMessages[permission] ?? 'You do not have permission for this action.');
  }

  function openAddModal() {
    const requiredPermission = userActionPermissions.add;
    if (!hasPermission(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    setSelectedUser(null);
    setModal('add');
  }

  function openAssignGroupModal() {
    const requiredPermission = userActionPermissions.assignGroup;
    if (!hasPermission(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.warning('Select at least one user first.');
      return;
    }

    setModal('assignGroup');
  }

  async function openUserModal(action: Exclude<UserModalAction, 'add' | 'assignGroup'>, user: UserListItemDto) {
    if (action === 'details' && !hasPermission('USER_R')) {
      showPermissionNotice('USER_R');
      return;
    }

    if (action !== 'details') {
      const requiredPermission = userActionPermissions[action];
      if (!hasPermission(requiredPermission)) {
        showPermissionNotice(requiredPermission);
        return;
      }
    }

    setOpeningUserId(user.id);

    try {
      const fullUser = await getUserById(user.id);
      setSelectedUser(fullUser);
      setModal(action);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot load user details');
    } finally {
      setOpeningUserId(null);
    }
  }

  function closeModal() {
    setModal(null);
    setSelectedUser(null);
  }

  function goToPage(targetPage: number) {
    const nextPage = Math.min(Math.max(targetPage, 1), totalPages);
    if (nextPage === page || isLoading) {
      return;
    }

    setPage(nextPage);
  }

  function toggleSelectedUser(userId: string) {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  function toggleAllUsers() {
    setSelectedUserIds((current) => (
      current.length === tableUsers.length ? [] : tableUsers.map((user) => user.id)
    ));
  }

  function applyFilters() {
    setActiveFilters(filterDraft);
    setPage(1);
  }

  function clearFilters() {
    setFilterDraft(defaultFilters);
    setActiveFilters(defaultFilters);
    setPage(1);
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
