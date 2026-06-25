import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
};

const permissionRows: Record<PermissionScope, PermissionRow[]> = {
  users: [
    { key: 'USER_C' },
    { key: 'USER_R' },
    { key: 'USER_U' },
    { key: 'USER_D' },
  ],
  groups: [
    { key: 'GROUP_C' },
    { key: 'GROUP_R' },
    { key: 'GROUP_U' },
    { key: 'GROUP_D' },
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
  const { t } = useTranslation();
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
          toast.error(err instanceof Error ? err.message : t('admin.users.loadFailed'));
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
  }, [t, toast]);

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
      toast.error(t('admin.groups.groupNameRequired'));
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

      toast.success(t('admin.groups.groupCreated', { name }));
      onCreated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.createFailed');
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
            <h2>{t('admin.groups.createGroupTitle')}</h2>
            <p>{t('admin.groups.createGroupSubtitle')}</p>
          </div>
          <button type="button" aria-label={t('admin.groups.closeCreateGroup')} onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <p className="form-kicker">{t('admin.groups.identity')}</p>
          <div className="two-col">
            <label>
              {t('admin.groups.groupName')}
              <input
                placeholder={t('admin.groups.groupNamePlaceholder')}
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
              />
            </label>
            <label>
              {t('admin.groups.description')}
              <input
                placeholder={t('admin.groups.describeGroup')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>

          <div>
            <span className="label-text">{t('admin.groups.permissionType')}</span>
            <div className="segment two-option-segment">
              {permissionScopes.map((scope) => (
                <button
                  className={permissionScope === scope ? 'active' : ''}
                  type="button"
                  key={scope}
                  onClick={() => setPermissionScope(scope)}
                >
                  {scope === 'users' ? t('admin.groups.usersScope') : t('admin.groups.groupsScope')}
                </button>
              ))}
            </div>
          </div>

          <div className="matrix-title">
            <span className="form-kicker">{permissionScope === 'users' ? t('admin.groups.userPermissions') : t('admin.groups.groupPermissions')}</span>
            <em>{permissionScope === 'users' ? t('admin.groups.userPermissionsDescription') : t('admin.groups.groupPermissionsDescription')}</em>
          </div>
          <table className="permission-table">
            <thead><tr><th>{t('admin.groups.action')}</th><th>{t('admin.groups.description')}</th><th>{t('admin.groups.grant')}</th></tr></thead>
            <tbody>
              {activeRows.map((row) => (
                <tr key={row.key}>
                  <td>{t(`admin.groups.permissionsRows.${row.key}.action`)}</td>
                  <td>{t(`admin.groups.permissionsRows.${row.key}.description`)}</td>
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
          <div className="permission-summary">
            {permissionScopes
              .map((scope) => t('admin.groups.permissionSummary', {
                scope: scope === 'users' ? t('admin.groups.usersScope') : t('admin.groups.groupsScope'),
                count: getGrantedCount(permissions[scope], scope),
              }))
              .join(' / ')}
          </div>

          <p className="form-kicker">{t('admin.groups.initialMembers')}</p>
          <label className="member-search-field">
            <input
              placeholder={isLoadingUsers ? t('admin.users.loadingUsers') : t('admin.groups.searchUsersPlaceholderLong')}
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
              <span className="muted">{t('admin.users.noUsersFound')}</span>
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
          <button className="btn-cancel flat" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('admin.groups.creating') : t('admin.groups.initializeGroup')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupCreateModal;
