import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Plus, Search, Shield, Trash2, UserPlus } from 'lucide-react';
import ActionIconButton from '@/components/common/ActionIconButton';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import { useGroups } from '@/hooks/useGroups';
import '@/styles/pages/management.css';
import GroupCreateModal from './groups/GroupCreateModal';
import GroupDeleteModal from './groups/GroupDeleteModal';
import GroupDetailsModal from './groups/GroupDetailsModal';
import GroupMembersModal from './groups/GroupMembersModal';
import GroupUpdateModal from './groups/GroupUpdateModal';
import { formatGroupDate, toGroupViewModel, type GroupViewModel } from './groups/group-view-model';

function GroupsView() {
  const { t } = useTranslation();
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [isConfirmingDeleteSelected, setIsConfirmingDeleteSelected] = useState(false);
  const {
    modal,
    selectedGroup,
    groups,
    totalItems,
    page,
    limit,
    totalPages,
    isLoading,
    openingGroupId,
    selectedGroupIds,
    isDeletingSelectedGroups,
    search,
    canReadGroups,
    setSearch,
    applySearch,
    loadGroups,
    goToPage,
    openCreateModal,
    openGroupModal,
    closeModal,
    toggleSelectedGroup,
    toggleAllGroups: toggleAllGroupsSelection,
    deleteSelectedGroups,
  } = useGroups();

  const tableGroups = useMemo(() => {
    if (!canReadGroups) {
      return [];
    }

    return groups.map(toGroupViewModel);
  }, [canReadGroups, groups]);

  const isAllGroupsSelected = tableGroups.length > 0 && selectedGroupIds.length === tableGroups.length;
  const hasSelectedGroups = selectedGroupIds.length > 0;
  const showingFrom = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = totalItems === 0 ? 0 : Math.min(page * limit, totalItems);

  useEffect(() => {
    if (!selectAllRef.current) return;

    selectAllRef.current.indeterminate = hasSelectedGroups && !isAllGroupsSelected;
  }, [hasSelectedGroups, isAllGroupsSelected]);

  function toggleAllGroups() {
    toggleAllGroupsSelection(tableGroups.map((group) => group.id));
  }

  async function handleConfirmDeleteSelected() {
    await deleteSelectedGroups();
    setIsConfirmingDeleteSelected(false);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch();
  }

  const groupTableColumns: Array<DataTableColumn<GroupViewModel>> = [
    {
      key: 'select',
      header: (
        <label className="table-select-check">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={isAllGroupsSelected}
            onChange={toggleAllGroups}
            disabled={tableGroups.length === 0}
          />
          <span className="sr-only">{t('admin.groups.groupsSelected', { count: selectedGroupIds.length })}</span>
        </label>
      ),
      className: 'table-column-select',
      render: (group) => (
        <label className="table-select-check">
          <input
            type="checkbox"
            checked={selectedGroupIds.includes(group.id)}
            onChange={() => toggleSelectedGroup(group.id)}
          />
          <span className="sr-only">{group.name}</span>
        </label>
      ),
    },
    {
      key: 'name',
      header: t('admin.groups.groupName'),
      className: 'table-column-primary',
      render: (group) => (
        <div className="user-cell">
          <span className="avatar"><Shield size={18} aria-hidden="true" /></span>
          <strong>{group.name}</strong>
        </div>
      ),
    },
    {
      key: 'members',
      header: t('admin.groups.memberCount'),
      className: 'table-column-secondary',
      render: (group) => t('admin.groups.membersCount', { count: group.memberCount }),
    },
    {
      key: 'createdAt',
      header: t('admin.groups.created'),
      className: 'table-column-tertiary',
      render: (group) => formatGroupDate(group.createdAt),
    },
    {
      key: 'spacer',
      header: null,
      className: 'table-column-spacer',
      render: () => null,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'table-column-actions',
      render: (group) => (
        <div className="row-actions">
          <IconButton icon={Eye} label={t('admin.groups.viewGroup', { name: group.name })} onClick={() => openGroupModal('details', group)} disabled={openingGroupId === group.id} />
          <IconButton icon={UserPlus} label={t('admin.groups.manageMembersFor', { name: group.name })} onClick={() => openGroupModal('members', group)} disabled={openingGroupId === group.id} />
          <IconButton icon={Pencil} label={t('admin.groups.updateGroup', { name: group.name })} onClick={() => openGroupModal('update', group)} disabled={openingGroupId === group.id} />
          <IconButton icon={Trash2} label={t('admin.groups.deleteGroup', { name: group.name })} onClick={() => openGroupModal('delete', group)} />
        </div>
      ),
    },
  ];

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
      </header>

      <section className="data-card group-card">
        <div className={`bulk-row table-action-bar ${hasSelectedGroups ? 'selection-actions' : ''}`}>
          {hasSelectedGroups ? (
            <>
              <span>{t('admin.groups.groupsSelected', { count: selectedGroupIds.length })}</span>
              <ActionIconButton
                icon={Trash2}
                label={t('common.delete')}
                variant="danger"
                onClick={() => setIsConfirmingDeleteSelected(true)}
                disabled={isDeletingSelectedGroups}
                isLoading={isDeletingSelectedGroups}
              />
            </>
          ) : (
            <div className="table-toolbar">
              <form className="table-search-bar" onSubmit={handleSearchSubmit}>
                <input
                  value={search}
                  placeholder={t('admin.groups.searchPlaceholder')}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button type="submit" aria-label={t('common.search')}>
                  <Search size={22} aria-hidden="true" />
                </button>
              </form>
              <ActionIconButton
                icon={Plus}
                label={t('common.add')}
                variant="primary"
                onClick={openCreateModal}
              />
            </div>
          )}
        </div>
        {isLoading && <div className="state-row">{t('admin.groups.loadingGroups')}</div>}
        <div className={`data-table-body ${!isLoading && tableGroups.length === 0 ? 'is-empty' : ''}`}>
          <DataTable
            className="group-table"
            columns={groupTableColumns}
            data={tableGroups}
            getRowKey={(group) => group.id}
            getRowClassName={(group) => (selectedGroupIds.includes(group.id) ? 'selected' : undefined)}
          />
          {!isLoading && tableGroups.length === 0 && (
            <div className="empty-state">
              <Shield size={28} aria-hidden="true" />
              <h3>{t('admin.groups.noGroupsFound')}</h3>
              <p>{t('admin.groups.noGroupsDescription')}</p>
            </div>
          )}
        </div>

        <footer className="table-footer">
          <span>{t('admin.groups.showing', { from: showingFrom, to: showingTo, total: totalItems })}</span>
          <div className="pagination">
            <button type="button" disabled={page <= 1 || isLoading} onClick={() => goToPage(page - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                type="button"
                className={pageNumber === page ? 'active' : ''}
                key={pageNumber}
                disabled={isLoading}
                onClick={() => goToPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            <button type="button" disabled={page >= totalPages || isLoading} onClick={() => goToPage(page + 1)}>›</button>
          </div>
        </footer>
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
      {isConfirmingDeleteSelected && (
        <Modal
          className="modal-card compact-modal"
          labelledBy="delete-selected-groups-title"
          describedBy="delete-selected-groups-description"
          isDismissDisabled={isDeletingSelectedGroups}
          onClose={() => setIsConfirmingDeleteSelected(false)}
        >
            <header className="modal-header">
              <h2 id="delete-selected-groups-title">{t('admin.groups.deleteSelectedTitle')}</h2>
              <button
                type="button"
                aria-label={t('admin.groups.closeDeleteSelected')}
                onClick={() => setIsConfirmingDeleteSelected(false)}
                disabled={isDeletingSelectedGroups}
              >
                ×
              </button>
            </header>
            <div className="modal-body">
              <p className="confirm-description" id="delete-selected-groups-description">
                {t('admin.groups.deleteSelectedDescription', { count: selectedGroupIds.length })}
              </p>
            </div>
            <footer className="modal-footer">
              <button
                className="btn-muted"
                type="button"
                onClick={() => setIsConfirmingDeleteSelected(false)}
                disabled={isDeletingSelectedGroups}
              >
                {t('common.cancel')}
              </button>
              <button
                className="btn-solid-danger"
                type="button"
                onClick={() => void handleConfirmDeleteSelected()}
                disabled={isDeletingSelectedGroups}
              >
                {isDeletingSelectedGroups ? t('common.deleting') : t('common.delete')}
              </button>
            </footer>
        </Modal>
      )}
    </div>
  );
}

export default GroupsView;
