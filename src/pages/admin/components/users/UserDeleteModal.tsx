import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/common/Modal';
import { useToast } from '@/context/ToastContext';
import { deleteUser } from '@/services/user.service';
import type { UserDto } from '@/types/user.type';

type UserDeleteModalProps = {
  user: UserDto;
  onClose: () => void;
  onDeleted: () => void;
};

function UserDeleteModal({ user, onClose, onDeleted }: UserDeleteModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await deleteUser(user.id);
      toast.success(t('admin.users.deleted', { name: user.fullName }));
      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.users.deleteFailed');
      toast.error(message);
    } finally {
      setIsDeleting(false);
      onClose();
    }
  }

  return (
    <Modal
      className="modal-card user-modal compact-modal"
      labelledBy="user-delete-modal-title"
      describedBy="user-delete-modal-description"
      isDismissDisabled={isDeleting}
      onClose={onClose}
    >
        <header className="modal-header">
          <h2 id="user-delete-modal-title">{t('admin.users.deleteUserTitle')}</h2>
          <button type="button" aria-label={t('admin.users.closeDeleteUser')} onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <p className="confirm-description" id="user-delete-modal-description">
            {t('admin.users.deleteUserDescription', { email: user.email, name: user.fullName })}
          </p>
        </div>
        <footer className="modal-footer">
          <button className="btn-muted" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-solid-danger" type="button" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? t('common.deleting') : t('common.delete')}
          </button>
        </footer>
    </Modal>
  );
}

export default UserDeleteModal;
