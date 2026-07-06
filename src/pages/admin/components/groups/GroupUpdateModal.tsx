import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const permissionScopes: PermissionScope[] = ['users', 'groups'];

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

function GroupUpdateModal({ group, onClose, onUpdated }: GroupUpdateModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [groupName, setGroupName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [permissionScope, setPermissionScope] = useState<PermissionScope>('users');
  const [permissions, setPermissions] = useState<Record<PermissionScope, string[]>>(() => getInitialPermissions(group));
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
      await updateGroup(group.id, {
        name,
        description: description.trim() || undefined,
        permissions: permissionScopes.flatMap((scope) => permissions[scope]),
      });
      toast.success(t('admin.groups.groupUpdated', { name }));
      onUpdated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.updateFailed');
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
            <h2>{t('admin.groups.updateGroupTitle')}</h2>
            <p>{t('admin.groups.updateGroupSubtitle')}</p>
          </div>
          <button type="button" aria-label={t('admin.groups.closeUpdateGroup')} onClick={onClose}>×</button>
        </header>

        <div className="modal-body group-modal-body">
          <section className="group-form-section">
            <div className="section-heading">
              <p className="form-kicker">{t('admin.groups.identity')}</p>
            </div>

            <div className="group-basic-grid">
              <label className="group-name-field">
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
                  aria-describedby="group-update-name-error"
                />
                <span
                  className={`field-error${groupNameError ? '' : ' field-error-placeholder'}`}
                  id="group-update-name-error"
                  aria-live="polite"
                >
                  {groupNameError || '\u00A0'}
                </span>
              </label>

              <label className="group-description-field">
                <span className="form-label-text">{t('admin.groups.description')}</span>
                <input
                  placeholder={t('admin.groups.describeGroup')}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <span className="field-error field-error-placeholder" aria-hidden="true" />
              </label>
            </div>
          </section>

          <section className="group-form-section">
            <div className="section-heading permission-heading">
              <div>
                <p className="form-kicker">{t('admin.groups.permissions')}</p>
                <em>
                  {permissionScope === 'users'
                    ? t('admin.groups.userPermissionsDescription')
                    : t('admin.groups.groupPermissionsDescription')}
                </em>
              </div>

              <div className="segment two-option-segment permission-scope-tabs" role="group" aria-label={t('admin.groups.permissionType')}>
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
          </section>
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('admin.groups.updating') : t('common.update')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupUpdateModal;
