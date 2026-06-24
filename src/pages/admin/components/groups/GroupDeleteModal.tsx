import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { deleteGroup } from '@/services/group.service';
import type { GroupViewModel } from './group-view-model';

type GroupDeleteModalProps = {
  group: GroupViewModel;
  onClose: () => void;
  onDeleted: () => void;
};

function GroupDeleteModal({ group, onClose, onDeleted }: GroupDeleteModalProps) {
  const toast = useToast();
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = confirmName.trim() === group.name;

  async function handleDelete() {
    if (!canDelete) {
      toast.error('Please type the exact group name to confirm.');
      return;
    }

    setIsDeleting(true);

    try {
      await deleteGroup(group.id);
      toast.success(`Group "${group.name}" deleted successfully.`);
      onDeleted();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot delete group';
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
            <h2>Delete Group</h2>
            <p>This action removes group membership and permission assignments.</p>
          </div>
          <button type="button" aria-label="Close delete group" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <div className="danger-panel">
            <span className="form-kicker">Group</span>
            <strong>{group.name}</strong>
            <p>{group.memberCount} members will be detached from this group.</p>
          </div>
          <label>
            Confirm Group Name
            <input
              placeholder={group.name}
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
            />
          </label>
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-danger-solid" type="button" onClick={handleDelete} disabled={!canDelete || isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Group'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default GroupDeleteModal;
