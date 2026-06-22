import { UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import type { UserDto } from '@/services/user.service';
import { formatUserDate } from './user-view-model';

type UserDetailsModalProps = {
  user: UserDto;
  onClose: () => void;
};

function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card user-modal">
        <header className="modal-header">
          <h2 className="modal-title"><UserRound size={21} aria-hidden="true" /> User Details</h2>
          <IconButton icon={X} label="Close user details" onClick={onClose} />
        </header>
        <div className="modal-body">
          <div className="detail-grid">
            <div><span className="label-text">Full Name</span><strong>{user.fullName}</strong></div>
            <div><span className="label-text">Email</span><strong>{user.email}</strong></div>
            <div><span className="label-text">Phone</span><strong>{user.phoneNumber ?? 'No phone'}</strong></div>
            <div><span className="label-text">Address</span><strong>{user.address ?? 'No address'}</strong></div>
            <div><span className="label-text">Joined</span><strong>{formatUserDate(user.createdAt)}</strong></div>
          </div>
          <section className="detail-section">
            <p className="form-kicker">Groups</p>
            <div className="tag-row">
              {user.groups.length > 0
                ? user.groups.map((group) => <span className="tag" key={group.id}>{group.name}</span>)
                : <span className="muted">No groups assigned</span>}
            </div>
          </section>
        </div>
        <footer className="modal-footer">
          <button className="btn-primary" type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}

export default UserDetailsModal;
