import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { addGroupMembers, createGroup } from '@/services/group.service';
import { getUsers, type UserListItemDto } from '@/services/user.service';

type GroupCreateModalProps = {
  onClose: () => void;
  onCreated: () => void;
};

type PermissionScope = 'users' | 'groups';

type PermissionRow = {
  key: string;
  action: string;
  description: string;
};

const permissionRows: Record<PermissionScope, PermissionRow[]> = {
  users: [
    { key: 'USER_C', action: 'Create User', description: 'Invite or create users' },
    { key: 'USER_R', action: 'Read User', description: 'View user profiles' },
    { key: 'USER_U', action: 'Update User', description: 'Edit user data and roles' },
    { key: 'USER_D', action: 'Delete User', description: 'Remove users from workspace' },
  ],
  groups: [
    { key: 'GROUP_C', action: 'Create Group', description: 'Create nested groups' },
    { key: 'GROUP_R', action: 'Read Group', description: 'View group details and members' },
    { key: 'GROUP_U', action: 'Update Group', description: 'Edit group identity and permissions' },
    { key: 'GROUP_D', action: 'Delete Group', description: 'Remove groups and assignments' },
  ],
};

const defaultPermissions: Record<PermissionScope, string[]> = {
  users: ['USER_R'],
  groups: ['GROUP_R'],
};

const permissionLabels: Record<PermissionScope, string> = {
  users: 'User Permissions',
  groups: 'Group Permissions',
};

const permissionDescriptions: Record<PermissionScope, string> = {
  users: 'Permissions this group has over users.',
  groups: 'Permissions this group has over other groups.',
};

const permissionScopes: PermissionScope[] = ['users', 'groups'];

function togglePermission(permissions: string[], permission: string): string[] {
  if (permissions.includes(permission)) {
    return permissions.filter((item) => item !== permission);
  }

  return [...permissions, permission];
}

function formatScopeLabel(scope: PermissionScope): string {
  return scope === 'users' ? 'Users' : 'Groups';
}

function getGrantedCount(permissions: string[], scope: PermissionScope): number {
  return permissionRows[scope].filter((row) => permissions.includes(row.key)).length;
}

function getPermissionSummary(permissions: Record<PermissionScope, string[]>): string {
  return permissionScopes
    .map((scope) => `${formatScopeLabel(scope)}: ${getGrantedCount(permissions[scope], scope)}`)
    .join(' / ');
}

function GroupCreateModal({ onClose, onCreated }: GroupCreateModalProps) {
  const toast = useToast();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionScope, setPermissionScope] = useState<PermissionScope>('users');
  const [permissions, setPermissions] = useState<Record<PermissionScope, string[]>>(defaultPermissions);
  const [users, setUsers] = useState<UserListItemDto[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserListItemDto[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeRows = permissionRows[permissionScope];

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setIsLoadingUsers(true);

      try {
        const result = await getUsers(1, 100);
        if (!ignore) {
          setUsers(result.users);
        }
      } catch (err) {
        if (!ignore) {
          toast.error(err instanceof Error ? err.message : 'Cannot load users');
        }
      } finally {
        if (!ignore) {
          setIsLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [toast]);

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(selectedUsers.map((user) => user.id));
    const keyword = memberSearch.trim().toLowerCase();

    return users
      .filter((user) => !selectedIds.has(user.id))
      .filter((user) => {
        if (!keyword) return true;
        return `${user.fullName} ${user.email}`.toLowerCase().includes(keyword);
      })
      .slice(0, 6);
  }, [memberSearch, selectedUsers, users]);

  function handlePermissionToggle(permission: string) {
    setPermissions((current) => ({
      ...current,
      [permissionScope]: togglePermission(current[permissionScope], permission),
    }));
  }

  function addSelectedUser(user: UserListItemDto) {
    setSelectedUsers((current) => [...current, user]);
    setMemberSearch('');
  }

  function removeSelectedUser(userId: string) {
    setSelectedUsers((current) => current.filter((user) => user.id !== userId));
  }

  async function handleSubmit() {
    const name = groupName.trim();
    if (!name) {
      toast.error('Group name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const createdGroup = await createGroup({
        name,
        description: description.trim() || undefined,
        permissions: permissionScopes.flatMap((scope) => permissions[scope]),
      });

      const memberIds = selectedUsers.map((user) => user.id);
      if (memberIds.length > 0) {
        await addGroupMembers(createdGroup.id, memberIds);
      }

      toast.success(`Group "${name}" created successfully.`);
      onCreated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot create group';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card group-modal">
        <header className="modal-header stacked">
          <div>
            <h2>Create New Group</h2>
            <p>Define identity and access control for your new workspace.</p>
          </div>
          <button type="button" aria-label="Close create group" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <p className="form-kicker">Identity</p>
          <div className="two-col">
            <label>
              Group Name
              <input
                placeholder="e.g. Quantum Research Team"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
              />
            </label>
            <label>
              Description
              <input
                placeholder="Describe this group"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="label-text">Permission Type</span>
            <div className="segment two-option-segment">
              {permissionScopes.map((scope) => (
                <button
                  className={permissionScope === scope ? 'active' : ''}
                  type="button"
                  key={scope}
                  onClick={() => setPermissionScope(scope)}
                >
                  {formatScopeLabel(scope)}
                </button>
              ))}
            </div>
          </div>

          <div className="matrix-title">
            <span className="form-kicker">{permissionLabels[permissionScope]}</span>
            <em>{permissionDescriptions[permissionScope]}</em>
          </div>
          <table className="permission-table">
            <thead><tr><th>Action</th><th>Description</th><th>Grant</th></tr></thead>
            <tbody>
              {activeRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.action}</td>
                  <td>{row.description}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={permissions[permissionScope].includes(row.key)}
                      onChange={() => handlePermissionToggle(row.key)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="permission-summary">{getPermissionSummary(permissions)}</div>

          <p className="form-kicker">Initial Members</p>
          <label className="member-search-field">
            <input
              placeholder={isLoadingUsers ? 'Loading users...' : 'Search by name or email...'}
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              disabled={isLoadingUsers}
            />
          </label>
          <div className="member-picker-list">
            {availableUsers.map((user) => (
              <button type="button" key={user.id} onClick={() => addSelectedUser(user)}>
                <strong>{user.fullName}</strong>
                <span>{user.email}</span>
              </button>
            ))}
            {!isLoadingUsers && availableUsers.length === 0 && (
              <span className="muted">No users found</span>
            )}
          </div>
          <div className="tag-row">
            {selectedUsers.map((user) => (
              <button className="tag tag-button" type="button" key={user.id} onClick={() => removeSelectedUser(user.id)}>
                {user.fullName} x
              </button>
            ))}
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Initialize Group'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupCreateModal;
