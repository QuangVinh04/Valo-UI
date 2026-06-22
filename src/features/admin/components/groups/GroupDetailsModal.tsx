import { formatGroupDate, type GroupViewModel } from './group-view-model';

type GroupDetailsModalProps = {
  group: GroupViewModel;
  onClose: () => void;
};

function GroupDetailsModal({ group, onClose }: GroupDetailsModalProps) {
  return (
    <div className="modal-backdrop">
      <section className="modal-card group-modal">
        <header className="modal-header stacked">
          <div>
            <h2>Group Details</h2>
            <p>Inspect group identity, permissions, and active members.</p>
          </div>
          <button type="button" aria-label="Close group details" onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <div className="detail-grid">
            <div>
              <span className="label-text">Group Name</span>
              <strong>{group.name}</strong>
            </div>
            <div>
              <span className="label-text">Members</span>
              <strong>{group.memberCount}</strong>
            </div>
            <div>
              <span className="label-text">Created</span>
              <strong>{formatGroupDate(group.createdAt)}</strong>
            </div>
            <div>
              <span className="label-text">Updated</span>
              <strong>{formatGroupDate(group.updatedAt)}</strong>
            </div>
          </div>

          <section className="detail-section">
            <p className="form-kicker">Description</p>
            <p>{group.description}</p>
          </section>

          <section className="detail-section">
            <p className="form-kicker">Permissions</p>
            <div className="tag-row">
              {group.permissions.length > 0 ? (
                group.permissions.map((permission) => <span className="tag" key={permission}>{permission}</span>)
              ) : (
                <span className="muted">No permissions assigned</span>
              )}
            </div>
          </section>

          <section className="detail-section">
            <p className="form-kicker">Members</p>
            <div className="member-list">
              {group.members.length > 0 ? (
                group.members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <strong>{member.fullName}</strong>
                    <span>{member.email}</span>
                  </div>
                ))
              ) : (
                <div className="member-row muted">No members in this group</div>
              )}
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <button className="btn-primary btn-xl" type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}

export default GroupDetailsModal;
