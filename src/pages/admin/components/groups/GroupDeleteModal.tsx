import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { deleteGroup } from '@/services/group.service';
import type { GroupViewModel } from './group-view-model';

type GroupDeleteModalProps = {
  group: GroupViewModel;
  onClose: () => void;
  onDeleted: () => void;
};

function GroupDeleteModal({ group, onClose, onDeleted }: GroupDeleteModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmName.trim() === group.name;

  async function handleDelete() {
    if (!canDelete) {
      toast.error(t('admin.groups.confirmGroupNameRequired'));
      return;
    }

    setIsDeleting(true);

    try {
      await deleteGroup(group.id);
      toast.success(t('admin.groups.deleted', { name: group.name }));
      onDeleted();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.deleteFailed');
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card group-modal compact-modal">
        <header className="modal-header stacked">
          <div>
            <h2>{t('admin.groups.deleteGroupTitle')}</h2>
            <p>{t('admin.groups.deleteGroupSubtitle')}</p>
          </div>
          <button type="button" aria-label={t('admin.groups.closeDeleteGroup')} onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <div className="danger-panel">
            <span className="form-kicker">{t('common.group')}</span>
            <strong>{group.name}</strong>
            <p>{t('admin.groups.deleteDetachDescription', { count: group.memberCount })}</p>
          </div>
          <label>
            {t('admin.groups.confirmGroupName')}
            <input
              placeholder={group.name}
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
            />
          </label>
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-danger-solid" type="button" onClick={handleDelete} disabled={!canDelete || isDeleting}>
            {isDeleting ? t('common.deleting') : t('admin.groups.deleteGroupTitle')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupDeleteModal;
