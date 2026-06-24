import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import IconButton from '@/components/common/IconButton';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getGroupById, getGroupMembers, getGroups, type GroupListItemDto } from '@/services/group.service';
import '@/styles/pages/management.css';
import GroupCreateModal from './groups/GroupCreateModal';
import GroupDeleteModal from './groups/GroupDeleteModal';
import GroupDetailsModal from './groups/GroupDetailsModal';
import GroupMembersModal from './groups/GroupMembersModal';
import GroupUpdateModal from './groups/GroupUpdateModal';
import { toGroupViewModel, type GroupViewModel } from './groups/group-view-model';

type GroupModalAction = 'create' | 'details' | 'update' | 'members' | 'delete';

const groupActionPermissions: Record<Exclude<GroupModalAction, 'details'>, string> = {
  create: 'GROUP_C',
  update: 'GROUP_U',
  members: 'GROUP_U',
  delete: 'GROUP_D',
};

const permissionMessages: Record<string, string> = {
  GROUP_R: 'You do not have permission to view group details.',
  GROUP_C: 'You do not have permission to create groups.',
  GROUP_U: 'You do not have permission to update groups or manage members.',
  GROUP_D: 'You do not have permission to delete groups.',
};

function GroupsView() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canReadGroups = hasPermission('GROUP_R');
  const [modal, setModal] = useState<GroupModalAction | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModel | null>(null);
  const [groups, setGroups] = useState<GroupListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingGroupId, setOpeningGroupId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!hasPermission('GROUP_R')) {
      setGroups([]);
      toast.warning('You can open Group Management, but you do not have permission to view group data.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await getGroups();
      setGroups(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot load groups');
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission, toast]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const tableGroups = useMemo(() => {
    if (!canReadGroups) {
      return [];
    }

    return groups.map(toGroupViewModel);
  }, [canReadGroups, groups]);

  function showPermissionNotice(permission: string) {
    const message = permissionMessages[permission] ?? 'You do not have permission for this action.';
    toast.warning(message);
  }

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

  function openCreateModal() {
    const requiredPermission = groupActionPermissions.create;
    if (!hasPermission(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    setModal('create');
  }

  async function openGroupModal(action: Exclude<GroupModalAction, 'create'>, group: GroupViewModel) {
    if (action === 'details' && !hasPermission('GROUP_R')) {
      showPermissionNotice('GROUP_R');
      return;
    }

    if (action !== 'details') {
      const requiredPermission = groupActionPermissions[action];
      if (!hasPermission(requiredPermission)) {
        showPermissionNotice(requiredPermission);
        return;
      }
    }

    if (action === 'delete') {
      setSelectedGroup(group);
      setModal(action);
      return;
    }

    try {
      setOpeningGroupId(group.id);

      if (action === 'members') {
        const memberGroup = await getGroupMembers(group.id);
        setSelectedGroup(toGroupViewModel({ ...group, ...memberGroup }));
      } else {
        const detailGroup = await getGroupById(group.id);
        const memberGroup = action === 'details'
          ? await getGroupMembers(group.id)
          : null;

        setSelectedGroup(toGroupViewModel({
          ...detailGroup,
          ...(memberGroup ? {
            memberCount: memberGroup.memberCount,
            members: memberGroup.members,
          } : {}),
        }));
      }

      setModal(action);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot load group details');
    } finally {
      setOpeningGroupId(null);
    }
  }

  function closeModal() {
    setModal(null);
    setSelectedGroup(null);
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
