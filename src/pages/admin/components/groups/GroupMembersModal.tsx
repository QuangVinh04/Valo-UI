import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Trash2, Users, X } from 'lucide-react';
import ActionIconButton from '@/components/common/ActionIconButton';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import IconButton from '@/components/common/IconButton';
import Modal from '@/components/common/Modal';
import { useToast } from '@/context/ToastContext';
import { getGroupMembers, removeGroupMembers } from '@/services/group.service';
import type { GroupMemberDto } from '@/types/group.type';
import GroupAddMembersPanel from './GroupAddMembersPanel';
import type { GroupViewModel } from './group-view-model';

type CurrentMember = GroupViewModel['members'][number];

type GroupMembersModalProps = {
  group: GroupViewModel;
  onClose: () => void;
  onMembersChanged: () => void;
};

function GroupMembersModal({ group, onClose, onMembersChanged }: GroupMembersModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const memberPageSize = 5;

  const [currentMembers, setCurrentMembers] = useState(group.members);
  const [currentMemberIds, setCurrentMemberIds] = useState(group.members.map((member) => member.id));
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberPage, setMemberPage] = useState<'list' | 'add'>('list');
  const [memberSearch, setMemberSearch] = useState('');
  const [activeMemberSearch, setActiveMemberSearch] = useState('');
  const [memberTablePage, setMemberTablePage] = useState(1);
  const [totalMemberItems, setTotalMemberItems] = useState(group.memberCount);
  const [totalMemberPages, setTotalMemberPages] = useState(Math.max(1, Math.ceil(group.memberCount / memberPageSize)));
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const memberModalTitleRef = useRef<HTMLHeadingElement>(null);
  const removeConfirmationTitleRef = useRef<HTMLHeadingElement>(null);

  const loadMembers = useCallback(async (targetPage = 1, search = activeMemberSearch) => {
    setIsLoadingMembers(true);

    try {
      const result = await getGroupMembers(group.id, targetPage, memberPageSize, search);
      setCurrentMembers(result.group.members);
      setTotalMemberItems(result.meta?.totalItems ?? result.group.memberCount);
      setTotalMemberPages(Math.max(1, result.meta?.totalPages ?? 1));
      setMemberTablePage(result.meta?.page ?? targetPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.loadDetailsFailed');
      toast.error(message);
      setCurrentMembers([]);
      setTotalMemberItems(0);
      setTotalMemberPages(1);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [activeMemberSearch, group.id, t, toast]);

  useEffect(() => {
    setCurrentMembers(group.members);
    setCurrentMemberIds(group.members.map((member) => member.id));
    setSelectedMemberIds([]);
    setMemberPage('list');
    setMemberSearch('');
    setActiveMemberSearch('');
    setMemberTablePage(1);
    setTotalMemberItems(group.memberCount);
    setTotalMemberPages(Math.max(1, Math.ceil(group.memberCount / memberPageSize)));
    setIsConfirmingRemove(false);
  }, [group]);

  useEffect(() => {
    if (memberPage === 'list') {
      void loadMembers(memberTablePage, activeMemberSearch);
    }
  }, [activeMemberSearch, loadMembers, memberPage, memberTablePage]);

  function toggleSelectedMember(userId: string) {
    setSelectedMemberIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  function toggleAllMembers() {
    const visibleIds = currentMembers.map((member) => member.id);

    setSelectedMemberIds((current) => {
      const visibleIdSet = new Set(visibleIds);
      const hasSelectedAllVisible = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));

      if (hasSelectedAllVisible) {
        return current.filter((id) => !visibleIdSet.has(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  function openRemoveConfirmation() {
    if (selectedMemberIds.length === 0) {
      toast.error(t('admin.groups.selectAtLeastOneMember'));
      return;
    }

    setIsConfirmingRemove(true);
  }

  async function handleRemoveMembers() {
    setIsRemoving(true);

    try {
      const updatedGroup = await removeGroupMembers(group.id, selectedMemberIds);
      toast.success(t('admin.groups.membersRemoved', { count: selectedMemberIds.length, name: group.name }));
      setCurrentMemberIds(updatedGroup.members.map((member) => member.id));
      setSelectedMemberIds([]);
      setMemberTablePage(1);
      setIsConfirmingRemove(false);
      await loadMembers(1, activeMemberSearch);
      onMembersChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.removeFailed');
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  }

  function handleMembersAdded(updatedGroup: GroupMemberDto) {
    setCurrentMemberIds(updatedGroup.members.map((member) => member.id));
    setSelectedMemberIds([]);
    setMemberSearch('');
    setActiveMemberSearch('');
    setMemberTablePage(1);
    setMemberPage('list');
    void loadMembers(1, '');
    onMembersChanged();
  }

  function handleMemberSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelectedMemberIds([]);
    setMemberTablePage(1);
    setActiveMemberSearch(memberSearch.trim());
  }

  function goToMemberPage(targetPage: number) {
    const nextPage = Math.min(Math.max(targetPage, 1), totalMemberPages);

    if (nextPage !== memberTablePage) {
      setMemberTablePage(nextPage);
    }
  }

  function getMemberInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }

  const visibleMemberIds = currentMembers.map((member) => member.id);
  const isAllMembersSelected = visibleMemberIds.length > 0 && visibleMemberIds.every((id) => selectedMemberIds.includes(id));
  const hasSelectedMembers = selectedMemberIds.length > 0;
  const showingFrom = totalMemberItems === 0 ? 0 : (memberTablePage - 1) * memberPageSize + 1;
  const showingTo = totalMemberItems === 0 ? 0 : Math.min(memberTablePage * memberPageSize, totalMemberItems);
  const isAddPage = memberPage === 'add';

  const memberTableColumns: Array<DataTableColumn<CurrentMember>> = [
    {
      key: 'select',
      header: (
        <label className="member-check-cell">
          <input
            className="member-checkbox-input"
            type="checkbox"
            checked={isAllMembersSelected}
            onChange={toggleAllMembers}
            disabled={currentMembers.length === 0}
          />
          <span className="member-checkbox-box" aria-hidden="true" />
          <span className="sr-only">{t('admin.groups.selectAllMembers')}</span>
        </label>
      ),
      className: 'table-column-select',
      render: (member) => (
        <label className="member-check-cell">
          <input
            className="member-checkbox-input"
            type="checkbox"
            checked={selectedMemberIds.includes(member.id)}
            onChange={() => toggleSelectedMember(member.id)}
          />
          <span className="member-checkbox-box" aria-hidden="true" />
          <span className="sr-only">{t('admin.groups.selectMember', { name: member.fullName })}</span>
        </label>
      ),
    },
    {
      key: 'name',
      header: t('common.name'),
      className: 'table-column-primary',
      render: (member) => (
        <div className="user-cell">
          <span className="member-avatar-small" aria-hidden="true">{getMemberInitials(member.fullName)}</span>
          <strong>{member.fullName}</strong>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('common.email'),
      className: 'table-column-secondary',
      render: (member) => member.email,
    },
  ];

  return (
    <Modal
      className={`modal-card group-modal ${isAddPage ? 'compact-modal' : 'member-management-modal'}`}
      labelledBy="group-members-modal-title"
      describedBy="group-members-modal-description"
      initialFocusRef={memberModalTitleRef}
      isDismissDisabled={isRemoving || isConfirmingRemove}
      onClose={onClose}
    >
      <header className="modal-header stacked">
        <div>
          <h2 id="group-members-modal-title" ref={memberModalTitleRef} tabIndex={-1}>
            {isAddPage ? t('admin.groups.addMembers') : t('admin.groups.manageMembers')}
          </h2>
          <p id="group-members-modal-description">
            {isAddPage ? t('admin.groups.attachUsersToGroup', { name: group.name }) : t('admin.groups.addRemoveUsers', { name: group.name })}
          </p>
        </div>
        <IconButton icon={X} label={t('admin.groups.closeMemberManagement')} onClick={onClose} />
      </header>

      <div className="modal-body member-modal-body">
        {isAddPage ? (
          <GroupAddMembersPanel
            group={group}
            currentMemberIds={currentMemberIds}
            onBack={() => setMemberPage('list')}
            onMembersAdded={handleMembersAdded}
          />
        ) : (
          <section className="member-table-card">
            <div className={`bulk-row table-action-bar ${hasSelectedMembers ? 'selection-actions' : ''}`}>
              {hasSelectedMembers ? (
                <>
                  <span className="member-selection-count">
                    {t('common.selected', { count: selectedMemberIds.length })}
                  </span>
                  <ActionIconButton
                    icon={Trash2}
                    label={isRemoving ? t('common.deleting') : t('common.delete')}
                    variant="danger"
                    onClick={openRemoveConfirmation}
                    isLoading={isRemoving}
                    disabled={isRemoving}
                  />
                </>
              ) : (
                <div className="table-toolbar">
                  <form className="table-search-bar member-search-bar" onSubmit={handleMemberSearchSubmit}>
                    <input
                      value={memberSearch}
                      placeholder={t('admin.groups.searchUsersPlaceholderLong')}
                      onChange={(event) => setMemberSearch(event.target.value)}
                    />
                    <button type="submit" aria-label={t('common.search')}>
                      <Search size={22} aria-hidden="true" />
                    </button>
                  </form>
                  <ActionIconButton
                    icon={Plus}
                    label={t('common.add')}
                    variant="primary"
                    onClick={() => setMemberPage('add')}
                  />
                </div>
              )}
            </div>

            <div className={`data-table-body member-table-body ${!isLoadingMembers && currentMembers.length === 0 ? 'is-empty' : ''}`}>
              <DataTable
                className="member-management-table"
                columns={memberTableColumns}
                data={currentMembers}
                getRowKey={(member) => member.id}
                getRowClassName={(member) => (
                  selectedMemberIds.includes(member.id) ? 'selected' : undefined
                )}
              />
              {isLoadingMembers && <div className="state-row member-table-state">{t('common.loading')}</div>}
              {!isLoadingMembers && currentMembers.length === 0 && (
                <div className="member-empty-state">
                  <Users size={28} aria-hidden="true" />
                  <strong>{t('admin.groups.noMembersInGroup')}</strong>
                  <span>{t('admin.groups.typeToSearchUsers')}</span>
                </div>
              )}
            </div>
            <footer className="table-footer member-table-footer">
              <span>
                {t('admin.groups.membersShowing', {
                  from: showingFrom,
                  to: showingTo,
                  total: totalMemberItems,
                })}
              </span>
              <div className="pagination">
                <button
                  type="button"
                  disabled={memberTablePage <= 1 || isLoadingMembers || totalMemberItems === 0}
                  onClick={() => goToMemberPage(memberTablePage - 1)}
                >
                  {'<'}
                </button>
                {Array.from({ length: totalMemberPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    type="button"
                    className={pageNumber === memberTablePage ? 'active' : ''}
                    key={pageNumber}
                    disabled={isLoadingMembers || totalMemberItems === 0}
                    onClick={() => goToMemberPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={memberTablePage >= totalMemberPages || isLoadingMembers || totalMemberItems === 0}
                  onClick={() => goToMemberPage(memberTablePage + 1)}
                >
                  {'>'}
                </button>
              </div>
            </footer>
          </section>
        )}
      </div>

      {!isAddPage && (
        <footer className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>{t('common.done')}</button>
        </footer>
      )}

      {isConfirmingRemove && (
        <Modal
          backdropClassName="modal-backdrop confirm-modal-backdrop"
          className="confirm-popover"
          labelledBy="remove-members-title"
          describedBy="remove-members-description"
          initialFocusRef={removeConfirmationTitleRef}
          isDismissDisabled={isRemoving}
          onClose={() => setIsConfirmingRemove(false)}
        >
          <header className="confirm-popover-header">
            <div>
              <p className="form-kicker">{t('admin.groups.removeMembers')}</p>
              <h3 id="remove-members-title" ref={removeConfirmationTitleRef} tabIndex={-1}>
                {t('admin.groups.confirmRemoval')}
              </h3>
            </div>
            <IconButton icon={X} label={t('admin.groups.closeRemoveConfirmation')} onClick={() => setIsConfirmingRemove(false)} />
          </header>
          <div className="confirm-popover-body" id="remove-members-description">
            <p>
              {t('admin.groups.removeConfirmText', { count: selectedMemberIds.length, name: group.name })}
            </p>
            <span>{t('admin.groups.removeConfirmHelp')}</span>
          </div>
          <footer className="confirm-popover-actions">
            <button className="btn-muted" type="button" onClick={() => setIsConfirmingRemove(false)} disabled={isRemoving}>
              {t('common.cancel')}
            </button>
            <button className="btn-solid-danger" type="button" onClick={handleRemoveMembers} disabled={isRemoving}>
              {isRemoving ? t('admin.groups.removing') : t('common.delete')}
            </button>
          </footer>
        </Modal>
      )}
    </Modal>
  );
}

export default GroupMembersModal;
