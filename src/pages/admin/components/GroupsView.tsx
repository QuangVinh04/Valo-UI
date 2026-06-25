import { useMemo } from 'react';
import { Eye, Pencil, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useGroups } from '@/hooks/useGroups';
import '@/styles/pages/management.css';
import GroupCreateModal from './groups/GroupCreateModal';
import GroupDeleteModal from './groups/GroupDeleteModal';
import GroupDetailsModal from './groups/GroupDetailsModal';
import GroupMembersModal from './groups/GroupMembersModal';
import GroupUpdateModal from './groups/GroupUpdateModal';
import { toGroupViewModel } from './groups/group-view-model';

function GroupsView() {
  const {
    modal,
    selectedGroup,
    groups,
    isLoading,
    openingGroupId,
    canReadGroups,
    loadGroups,
    openCreateModal,
    openGroupModal,
    closeModal,
  } = useGroups();

  const tableGroups = useMemo(() => {
    if (!canReadGroups) {
      return [];
    }

    return groups.map(toGroupViewModel);
  }, [canReadGroups, groups]);

  if (!canReadGroups) {
    return (
      <div className="management-page">
        <section className="data-card access-denied-card">
          <h1>Access denied</h1>
          <p>You do not have permission to view group data.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="management-page">
      <header className="page-hero">
        <div>
          <h1>Group Management</h1>
          <p>
            Monitor and coordinate high-performance intelligence teams. View active
            groups, manage permissions, and inspect nested member hierarchies.
          </p>
        </div>
        <button className="btn-primary btn-xl" type="button" onClick={openCreateModal}>
          <Plus size={18} aria-hidden="true" />
          Create New Group
        </button>
      </header>

      <section className="data-card group-card">
        <div className="card-title-row">
          <h2>Active Groups</h2>
          <span className="count-badge">{tableGroups.length} Total</span>
        </div>
        {isLoading && <div className="state-row">Loading groups from backend...</div>}
        <table className="data-table group-table">
          <thead>
            <tr><th>Group Name</th><th>Member Count</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {tableGroups.map((group) => (
              <tr key={group.id}>
                <td>
                  <div className="user-cell">
                    <span className="avatar"><Shield size={18} aria-hidden="true" /></span>
                    <strong>{group.name}</strong>
                  </div>
                </td>
                <td>{group.memberCount} members</td>
                <td>
                  <div className="row-actions">
                    <IconButton icon={Eye} label={`View ${group.name}`} onClick={() => openGroupModal('details', group)} disabled={openingGroupId === group.id} />
                    <IconButton icon={UserPlus} label={`Manage members for ${group.name}`} onClick={() => openGroupModal('members', group)} disabled={openingGroupId === group.id} />
                    <IconButton icon={Pencil} label={`Update ${group.name}`} onClick={() => openGroupModal('update', group)} disabled={openingGroupId === group.id} />
                    <IconButton icon={Trash2} label={`Delete ${group.name}`} onClick={() => openGroupModal('delete', group)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tableGroups.length === 0 && (
          <div className="empty-state">
            <Shield size={28} aria-hidden="true" />
            <h3>No groups found</h3>
            <p>Create a group to start assigning permissions and members.</p>
          </div>
        )}
      </section>

      {modal === 'create' && <GroupCreateModal onClose={closeModal} onCreated={() => loadGroups()} />}
      {modal === 'details' && selectedGroup && <GroupDetailsModal group={selectedGroup} onClose={closeModal} />}
      {modal === 'update' && selectedGroup && (
        <GroupUpdateModal group={selectedGroup} onClose={closeModal} onUpdated={() => loadGroups()} />
      )}
      {modal === 'members' && selectedGroup && (
        <GroupMembersModal group={selectedGroup} onClose={closeModal} onMembersChanged={() => loadGroups()} />
      )}
      {modal === 'delete' && selectedGroup && (
        <GroupDeleteModal group={selectedGroup} onClose={closeModal} onDeleted={() => loadGroups()} />
      )}
    </div>
  );
}

export default GroupsView;
