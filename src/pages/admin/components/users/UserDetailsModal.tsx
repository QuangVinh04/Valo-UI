import { useTranslation } from 'react-i18next';
import { UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import type { UserDto } from '@/types/user.type';
import { formatUserDate } from './user-view-model';

type UserDetailsModalProps = {
  user: UserDto;
  onClose: () => void;
};

function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop">
      <section className="modal-card user-modal">
        <header className="modal-header">
          <h2 className="modal-title"><UserRound size={21} aria-hidden="true" /> {t('admin.users.userDetails')}</h2>
          <IconButton icon={X} label={t('admin.users.closeUserDetails')} onClick={onClose} />
        </header>
        <div className="modal-body">
          <div className="detail-grid">
            <div><span className="label-text">{t('admin.users.fullName')}</span><strong>{user.fullName}</strong></div>
            <div><span className="label-text">{t('common.email')}</span><strong>{user.email}</strong></div>
            <div><span className="label-text">{t('admin.users.phone')}</span><strong>{user.phoneNumber ?? t('admin.users.noPhone')}</strong></div>
            <div><span className="label-text">{t('admin.users.address')}</span><strong>{user.address ?? t('admin.users.noAddress')}</strong></div>
            <div><span className="label-text">{t('admin.users.joined')}</span><strong>{formatUserDate(user.createdAt)}</strong></div>
          </div>
          <section className="detail-section">
            <p className="form-kicker">{t('common.groups')}</p>
            <div className="tag-row">
              {user.groups.length > 0
                ? user.groups.map((group) => <span className="tag" key={group.id}>{group.name}</span>)
                : <span className="muted">{t('admin.users.noGroupsAssigned')}</span>}
            </div>
          </section>
        </div>
        <footer className="modal-footer">
          <button className="btn-primary" type="button" onClick={onClose}>{t('common.done')}</button>
        </footer>
      </section>
    </div>
  );
}

export default UserDetailsModal;
