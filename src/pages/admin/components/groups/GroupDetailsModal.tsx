import { useTranslation } from 'react-i18next';
import { formatGroupDate, type GroupViewModel } from './group-view-model';

type GroupDetailsModalProps = {
  group: GroupViewModel;
  onClose: () => void;
};

function GroupDetailsModal({ group, onClose }: GroupDetailsModalProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card group-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header stacked">
          <div>
            <h2>{t('admin.groups.groupDetails')}</h2>
            <p>{t('admin.groups.groupDetailsSubtitle')}</p>
          </div>
          <button type="button" aria-label={t('admin.groups.closeGroupDetails')} onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-field-primary">
              <span className="label-text">{t('admin.groups.groupName')}</span>
              <strong>{group.name}</strong>
            </div>
            <div>
              <span className="label-text">{t('common.members')}</span>
              <strong>{group.memberCount}</strong>
            </div>
            <div>
              <span className="label-text">{t('admin.groups.created')}</span>
              <strong>{formatGroupDate(group.createdAt)}</strong>
            </div>
            <div>
              <span className="label-text">{t('admin.groups.updated')}</span>
              <strong>{formatGroupDate(group.updatedAt)}</strong>
            </div>
          </div>

          <section className="detail-section">
            <p className="form-kicker">{t('admin.groups.description')}</p>
            <p>{group.description}</p>
          </section>

          <section className="detail-section">
            <p className="form-kicker">{t('admin.groups.permissions')}</p>
            <div className="tag-row">
              {group.permissions.length > 0 ? (
                group.permissions.map((permission) => <span className="tag" key={permission}>{permission}</span>)
              ) : (
                <span className="muted">{t('admin.groups.noPermissionsAssigned')}</span>
              )}
            </div>
          </section>

          <section className="detail-section">
            <p className="form-kicker">{t('common.members')}</p>
            <div className="member-list">
              {group.members.length > 0 ? (
                group.members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <strong>{member.fullName}</strong>
                    <span>{member.email}</span>
                  </div>
                ))
              ) : (
                <div className="member-row muted">{t('admin.groups.noMembersInGroup')}</div>
              )}
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <button className="btn-primary btn-xl" type="button" onClick={onClose}>{t('common.done')}</button>
        </footer>
      </section>
    </div>
  );
}

export default GroupDetailsModal;
