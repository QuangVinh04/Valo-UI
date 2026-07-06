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
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
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
    <div className="modal-backdrop" onClick={() => { if (!isDeleting) onClose(); }}>
      <section className="modal-card group-modal compact-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header stacked">
          <div>
            <h2>{t('admin.groups.deleteGroupTitle')}</h2>
            <p>{t('admin.groups.deleteGroupSubtitle')}</p>
          </div>
          <button type="button" aria-label={t('admin.groups.closeDeleteGroup')} onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <p className="confirm-description">
            {t('admin.groups.deleteDetachDescription', { count: group.memberCount, name: group.name })}
          </p>
        </div>

        <footer className="modal-footer">
          <button className="btn-muted" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-solid-danger" type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? t('common.deleting') : t('common.delete')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupDeleteModal;
