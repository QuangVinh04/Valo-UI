import { useTranslation } from 'react-i18next';
import { UserRound, X } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import type { UserDto } from '@/types/user.type';
import { formatUserDate } from './user-view-model';

type UserDetailsModalProps = {
  user: UserDto;
  onClose: () => void;
};

function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      className="modal-card user-modal"
      labelledBy="user-details-modal-title"
      onClose={onClose}
    >
        <header className="modal-header">
          <h2 className="modal-title" id="user-details-modal-title"><UserRound size={21} aria-hidden="true" /> {t('admin.users.userDetails')}</h2>
          <IconButton icon={X} label={t('admin.users.closeUserDetails')} onClick={onClose} />
        </header>
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-field detail-field-wide detail-field-primary"><span className="label-text">{t('admin.users.fullName')}</span><strong>{user.fullName}</strong></div>
            <div className="detail-field"><span className="label-text">{t('common.email')}</span><strong>{user.email}</strong></div>
            <div className="detail-field"><span className="label-text">{t('admin.users.phone')}</span><strong>{user.phoneNumber ?? t('admin.users.noPhone')}</strong></div>
            <div className="detail-field"><span className="label-text">{t('admin.users.address')}</span><strong>{user.address ?? t('admin.users.noAddress')}</strong></div>
            <div className="detail-field"><span className="label-text">{t('admin.users.status')}</span><strong>{user.active ? t('admin.users.active') : t('admin.users.inactive')}</strong></div>
            <div className="detail-field"><span className="label-text">{t('admin.users.joined')}</span><strong>{formatUserDate(user.createdAt)}</strong></div>
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
    </Modal>
  );
}

export default UserDetailsModal;
