import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { deleteUser, type UserDto } from '@/services/user.service';

type UserDeleteModalProps = {
  user: UserDto;
  onClose: () => void;
  onDeleted: () => void;
};

function UserDeleteModal({ user, onClose, onDeleted }: UserDeleteModalProps) {
  const toast = useToast();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  async function handleDelete() {
    if (!canDelete) {
      toast.error('Please type the exact user email to confirm.');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteUser(user.id);
      toast.success(`User "${user.fullName}" deleted successfully.`);
      onDeleted();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot delete user';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card user-modal compact-modal">
        <header className="modal-header">
          <h2>Delete User</h2>
          <button type="button" aria-label="Close delete user" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          <div className="danger-panel">
            <span className="form-kicker">User</span>
            <strong>{user.fullName}</strong>
            <p>{user.email} will be removed from the workspace.</p>
          </div>
          <label>
            Confirm Email
            <input value={confirmEmail} placeholder={user.email} onChange={(event) => setConfirmEmail(event.target.value)} />
          </label>
        </div>
        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-danger-solid" type="button" onClick={handleDelete} disabled={!canDelete || isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserDeleteModal;
