import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
          <h1>{t('common.accessDenied')}</h1>
          <p>{t('admin.groups.accessDeniedDescription')}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="management-page">
      <header className="page-hero">
        <div>
          <h1>{t('admin.groups.pageTitle')}</h1>
          <p>
            {t('admin.groups.pageDescription')}
          </p>
        </div>
        <button className="btn-primary btn-xl" type="button" onClick={openCreateModal}>
          <Plus size={18} aria-hidden="true" />
          {t('admin.groups.createNewGroup')}
        </button>
      </header>

      <section className="data-card group-card">
        <div className="card-title-row">
          <h2>{t('admin.groups.activeGroups')}</h2>
          <span className="count-badge">{t('admin.groups.total', { count: tableGroups.length })}</span>
        </div>
        {isLoading && <div className="state-row">{t('admin.groups.loadingGroups')}</div>}
        <table className="data-table group-table">
          <thead>
            <tr><th>{t('admin.groups.groupName')}</th><th>{t('admin.groups.memberCount')}</th><th>{t('common.actions')}</th></tr>
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
                <td>{t('admin.groups.membersCount', { count: group.memberCount })}</td>
                <td>
                  <div className="row-actions">
                    <IconButton icon={Eye} label={t('admin.groups.viewGroup', { name: group.name })} onClick={() => openGroupModal('details', group)} disabled={openingGroupId === group.id} />
                    <IconButton icon={UserPlus} label={t('admin.groups.manageMembersFor', { name: group.name })} onClick={() => openGroupModal('members', group)} disabled={openingGroupId === group.id} />
                    <IconButton icon={Pencil} label={t('admin.groups.updateGroup', { name: group.name })} onClick={() => openGroupModal('update', group)} disabled={openingGroupId === group.id} />
                    <IconButton icon={Trash2} label={t('admin.groups.deleteGroup', { name: group.name })} onClick={() => openGroupModal('delete', group)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && tableGroups.length === 0 && (
          <div className="empty-state">
            <Shield size={28} aria-hidden="true" />
            <h3>{t('admin.groups.noGroupsFound')}</h3>
            <p>{t('admin.groups.noGroupsDescription')}</p>
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
