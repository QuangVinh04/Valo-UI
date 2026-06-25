import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { deleteUser, type UserDto } from '@/services/user.service';

type UserDeleteModalProps = {
  user: UserDto;
  onClose: () => void;
  onDeleted: () => void;
};

function UserDeleteModal({ user, onClose, onDeleted }: UserDeleteModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  async function handleDelete() {
    if (!canDelete) {
      toast.error(t('admin.users.confirmEmailRequired'));
      return;
    }

    setIsDeleting(true);

    try {
      await deleteUser(user.id);
      toast.success(t('admin.users.deleted', { name: user.fullName }));
      onDeleted();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.users.deleteFailed');
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card user-modal compact-modal">
        <header className="modal-header">
          <h2>{t('admin.users.deleteUserTitle')}</h2>
          <button type="button" aria-label={t('admin.users.closeDeleteUser')} onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="danger-panel">
            <span className="form-kicker">{t('common.user')}</span>
            <strong>{user.fullName}</strong>
            <p>{t('admin.users.deleteUserDescription', { email: user.email })}</p>
          </div>
          <label>
            {t('admin.users.confirmEmail')}
            <input value={confirmEmail} placeholder={user.email} onChange={(event) => setConfirmEmail(event.target.value)} />
          </label>
        </div>
        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-danger-solid" type="button" onClick={handleDelete} disabled={!canDelete || isDeleting}>
            {isDeleting ? t('common.deleting') : t('admin.users.deleteUserTitle')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserDeleteModal;
