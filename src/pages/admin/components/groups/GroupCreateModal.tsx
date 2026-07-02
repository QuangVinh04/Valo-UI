import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { createGroup } from '@/services/group.service';

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

const permissionScopes: PermissionScope[] = ['users', 'groups'];

function togglePermission(permissions: string[], permission: string): string[] {
  if (permissions.includes(permission)) {
    return permissions.filter((item) => item !== permission);
  }

  return [...permissions, permission];
}

function getGrantedCount(permissions: string[], scope: PermissionScope): number {
  return permissionRows[scope].filter((row) => permissions.includes(row.key)).length;
}

function GroupCreateModal({ onClose, onCreated }: GroupCreateModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionScope, setPermissionScope] = useState<PermissionScope>('users');
  const [permissions, setPermissions] =
    useState<Record<PermissionScope, string[]>>(defaultPermissions);
  const [isGroupNameTouched, setIsGroupNameTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeRows = permissionRows[permissionScope];
  const groupNameError = isGroupNameTouched && !groupName.trim()
    ? t('admin.groups.groupNameRequired')
    : '';

  function handlePermissionToggle(permission: string) {
    setPermissions((current) => ({
      ...current,
      [permissionScope]: togglePermission(current[permissionScope], permission),
    }));
  }

  async function handleSubmit() {
    const name = groupName.trim();

    if (!name) {
      setIsGroupNameTouched(true);
      toast.error(t('admin.groups.groupNameRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      await createGroup({
        name,
        description: description.trim() || undefined,
        permissions: permissionScopes.flatMap((scope) => permissions[scope]),
      });

      toast.success(t('admin.groups.groupCreated', { name }));
      onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('admin.groups.createFailed');

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }}>
      <section className="modal-card group-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header stacked">
          <div>
            <h2>{t('admin.groups.createGroupTitle')}</h2>
            <p>{t('admin.groups.createGroupSubtitle')}</p>
          </div>

          <button
            type="button"
            aria-label={t('admin.groups.closeCreateGroup')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <p className="form-kicker">{t('admin.groups.identity')}</p>

          <div className="two-col">
            <label>
              <span className="form-label-text">
                {t('admin.groups.groupName')}
                <span className="required-mark" aria-hidden="true">*</span>
              </span>
              <input
                className={groupNameError ? 'field-invalid' : undefined}
                placeholder={t('admin.groups.groupNamePlaceholder')}
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                onBlur={() => setIsGroupNameTouched(true)}
                aria-invalid={Boolean(groupNameError)}
                aria-describedby="group-name-error"
              />
              <span className="field-error" id="group-name-error" aria-live="polite">
                {groupNameError}
              </span>
            </label>

            <label>
              <span className="form-label-text">{t('admin.groups.description')}</span>
              <input
                placeholder={t('admin.groups.describeGroup')}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <span className="field-error" aria-hidden="true" />
            </label>
          </div>

          <div>
            <span className="label-text">
              {t('admin.groups.permissionType')}
            </span>

            <div className="segment two-option-segment">
              {permissionScopes.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  className={permissionScope === scope ? 'active' : ''}
                  onClick={() => setPermissionScope(scope)}
                >
                  {scope === 'users'
                    ? t('admin.groups.usersScope')
                    : t('admin.groups.groupsScope')}
                </button>
              ))}
            </div>
          </div>

          <div className="matrix-title">
            <span className="form-kicker">
              {permissionScope === 'users'
                ? t('admin.groups.userPermissions')
                : t('admin.groups.groupPermissions')}
            </span>

            <em>
              {permissionScope === 'users'
                ? t('admin.groups.userPermissionsDescription')
                : t('admin.groups.groupPermissionsDescription')}
            </em>
          </div>

          <table className="permission-table">
            <thead>
              <tr>
                <th>{t('admin.groups.action')}</th>
                <th>{t('admin.groups.description')}</th>
                <th>{t('admin.groups.grant')}</th>
              </tr>
            </thead>

            <tbody>
              {activeRows.map((row) => (
                <tr key={row.key}>
                  <td>{t(`admin.groups.permissionsRows.${row.key}.action`)}</td>
                  <td>
                    {t(`admin.groups.permissionsRows.${row.key}.description`)}
                  </td>
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
              .map((scope) =>
                t('admin.groups.permissionSummary', {
                  scope:
                    scope === 'users'
                      ? t('admin.groups.usersScope')
                      : t('admin.groups.groupsScope'),
                  count: getGrantedCount(permissions[scope], scope),
                }),
              )
              .join(' / ')}
          </div>
        </div>

        <footer className="modal-footer">
          <button
            className="btn-cancel flat"
            type="button"
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>

          <button
            className="btn-primary btn-xl"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t('admin.groups.creating')
              : t('admin.groups.initializeGroup')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupCreateModal;
