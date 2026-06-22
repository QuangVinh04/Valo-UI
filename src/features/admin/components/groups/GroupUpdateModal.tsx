import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { updateGroup } from '@/services/group.service';
import type { GroupViewModel } from './group-view-model';

type GroupUpdateModalProps = {
  group: GroupViewModel;
  onClose: () => void;
  onUpdated: () => void;
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

const permissionScopes: PermissionScope[] = ['users', 'groups'];

const permissionLabels: Record<PermissionScope, string> = {
  users: 'User Permissions',
  groups: 'Group Permissions',
};

const permissionDescriptions: Record<PermissionScope, string> = {
  users: 'Permissions this group has over users.',
  groups: 'Permissions this group has over other groups.',
};

function formatScopeLabel(scope: PermissionScope): string {
  return scope === 'users' ? 'Users' : 'Groups';
}

function getInitialPermissions(group: GroupViewModel): Record<PermissionScope, string[]> {
  return {
    users: permissionRows.users
      .filter((row) => group.permissions.includes(row.key))
      .map((row) => row.key),
    groups: permissionRows.groups
      .filter((row) => group.permissions.includes(row.key))
      .map((row) => row.key),
  };
}

function togglePermission(permissions: string[], permission: string): string[] {
  if (permissions.includes(permission)) {
    return permissions.filter((item) => item !== permission);
  }

  return [...permissions, permission];
}

function getGrantedCount(permissions: string[], scope: PermissionScope): number {
  return permissionRows[scope].filter((row) => permissions.includes(row.key)).length;
}

function getPermissionSummary(permissions: Record<PermissionScope, string[]>): string {
  return permissionScopes
    .map((scope) => `${formatScopeLabel(scope)}: ${getGrantedCount(permissions[scope], scope)}`)
    .join(' / ');
}

function GroupUpdateModal({ group, onClose, onUpdated }: GroupUpdateModalProps) {
  const toast = useToast();
  const [groupName, setGroupName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [permissionScope, setPermissionScope] = useState<PermissionScope>('users');
  const [permissions, setPermissions] = useState<Record<PermissionScope, string[]>>(() => getInitialPermissions(group));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeRows = permissionRows[permissionScope];

  function handlePermissionToggle(permission: string) {
    setPermissions((current) => ({
      ...current,
      [permissionScope]: togglePermission(current[permissionScope], permission),
    }));
  }

  async function handleSubmit() {
    const name = groupName.trim();
    if (!name) {
      toast.error('Group name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateGroup(group.id, {
        name,
        description: description.trim() || undefined,
        permissions: permissionScopes.flatMap((scope) => permissions[scope]),
      });
      toast.success(`Group "${name}" updated successfully.`);
      onUpdated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot update group';
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
            <h2>Update Group</h2>
            <p>Modify identity and access control for this group.</p>
          </div>
          <button type="button" aria-label="Close update group" onClick={onClose}>×</button>
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
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Group'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupUpdateModal;
