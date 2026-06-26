import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { removeGroupMembers } from '@/services/group.service';
import type { GroupMemberDto } from '@/types/group.type';
import GroupAddMembersPanel from './GroupAddMembersPanel';
import type { GroupViewModel } from './group-view-model';

type GroupMembersModalProps = {
  group: GroupViewModel;
  onClose: () => void;
  onMembersChanged: () => void;
};

function GroupMembersModal({ group, onClose, onMembersChanged }: GroupMembersModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [currentMembers, setCurrentMembers] = useState(group.members);
  const [currentMemberCount, setCurrentMemberCount] = useState(group.memberCount);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberPage, setMemberPage] = useState<'list' | 'add'>('list');
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    setCurrentMembers(group.members);
    setCurrentMemberCount(group.memberCount);
    setSelectedMemberIds([]);
    setMemberPage('list');
    setIsConfirmingRemove(false);
  }, [group]);

  function toggleSelectedMember(userId: string) {
    // Chọn hoặc bỏ chọn một thành viên hiện có trong nhóm.
    setSelectedMemberIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  function toggleAllMembers() {
    // Chọn toàn bộ thành viên hiện có hoặc bỏ chọn tất cả.
    setSelectedMemberIds((current) => (
      current.length === currentMembers.length ? [] : currentMembers.map((member) => member.id)
    ));
  }

  function openRemoveConfirmation() {
    // Yêu cầu xác nhận trước khi gỡ thành viên khỏi nhóm.
    if (selectedMemberIds.length === 0) {
      toast.error(t('admin.groups.selectAtLeastOneMember'));
      return;
    }

    setIsConfirmingRemove(true);
  }

  async function handleRemoveMembers() {
    // Gỡ các thành viên đã chọn và cập nhật lại danh sách trong modal.
    setIsRemoving(true);

    try {
      const updatedGroup = await removeGroupMembers(group.id, selectedMemberIds);
      toast.success(t('admin.groups.membersRemoved', { count: selectedMemberIds.length, name: group.name }));
      setCurrentMembers(updatedGroup.members);
      setCurrentMemberCount(updatedGroup.memberCount);
      setSelectedMemberIds([]);
      setIsConfirmingRemove(false);
      onMembersChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.removeFailed');
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  }

  function handleMembersAdded(updatedGroup: GroupMemberDto) {
    // Nhận danh sách thành viên mới từ panel thêm thành viên và quay lại trang danh sách.
    setCurrentMembers(updatedGroup.members);
    setCurrentMemberCount(updatedGroup.memberCount);
    setSelectedMemberIds([]);
    setMemberPage('list');
    onMembersChanged();
  }

  function getMemberInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }

  const isAllMembersSelected = currentMembers.length > 0 && selectedMemberIds.length === currentMembers.length;
  const selectedCountLabel = selectedMemberIds.length > 0
    ? t('common.selected', { count: selectedMemberIds.length })
    : t('admin.groups.noneSelected');
  const isAddPage = memberPage === 'add';

  return (
    <div className="modal-backdrop">
      <section className="modal-card group-modal">
        <header className="modal-header stacked">
          <div>
            <h2>{isAddPage ? t('admin.groups.addMembers') : t('admin.groups.manageMembers')}</h2>
            <p>{isAddPage ? t('admin.groups.attachUsersToGroup', { name: group.name }) : t('admin.groups.addRemoveUsers', { name: group.name })}</p>
          </div>
          <button type="button" aria-label={t('admin.groups.closeMemberManagement')} onClick={onClose}>×</button>
        </header>

        <div className="modal-body">
          <p className="form-kicker">{t('admin.groups.targetGroup')}</p>
          <div className="mock-input">
            <strong>{group.name}</strong>
            <span className="muted">{t('admin.groups.currentMembersCount', { count: currentMemberCount })}</span>
          </div>

          {isAddPage ? (
            <GroupAddMembersPanel
              group={group}
              currentMemberIds={currentMembers.map((member) => member.id)}
              onBack={() => setMemberPage('list')}
              onMembersAdded={handleMembersAdded}
            />
          ) : (
            <section className="member-table-card">
              <div className="member-section-header">
                <div>
                  <p className="form-kicker">{t('admin.groups.currentMembers')}</p>
                  <span className="member-selection-count">{selectedCountLabel}</span>
                </div>
                <div className="member-section-actions">
                  <button
                    className="btn-danger-link"
                    type="button"
                    onClick={openRemoveConfirmation}
                    disabled={selectedMemberIds.length === 0 || isRemoving}
                  >
                    {isRemoving ? t('common.deleting') : t('admin.groups.deleteSelected')}
                  </button>
                  <button
                    className="btn-chip"
                    type="button"
                    onClick={() => setMemberPage('add')}
                  >
                    {t('admin.groups.addMember')}
                  </button>
                </div>
              </div>
              <div className="member-table-wrap">
                {currentMembers.length > 0 ? (
                  <table className="data-table member-management-table">
                    <thead>
                      <tr>
                        <th>
                          <label className="member-check-cell">
                            <input
                              className="member-checkbox-input"
                              type="checkbox"
                              checked={isAllMembersSelected}
                              onChange={toggleAllMembers}
                            />
                            <span className="member-checkbox-box" aria-hidden="true" />
                            <span className="sr-only">{t('admin.groups.selectAllMembers')}</span>
                          </label>
                        </th>
                        <th>Name</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMembers.map((member) => (
                        <tr className={selectedMemberIds.includes(member.id) ? 'selected' : undefined} key={member.id}>
                          <td>
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
                          </td>
                          <td>
                            <div className="user-cell">
                              <span className="member-avatar-small" aria-hidden="true">{getMemberInitials(member.fullName)}</span>
                              <strong>{member.fullName}</strong>
                            </div>
                          </td>
                          <td>{member.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="member-row muted">{t('admin.groups.noMembersInGroup')}</div>
                )}
              </div>
            </section>
          )}
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel" type="button" onClick={onClose}>{t('common.done')}</button>
        </footer>
      </section>

      {isConfirmingRemove && (
        <section className="confirm-popover" role="dialog" aria-modal="true" aria-labelledby="remove-members-title">
          <header className="confirm-popover-header">
            <div>
              <p className="form-kicker">{t('admin.groups.removeMembers')}</p>
              <h3 id="remove-members-title">{t('admin.groups.confirmRemoval')}</h3>
            </div>
            <button type="button" aria-label={t('admin.groups.closeRemoveConfirmation')} onClick={() => setIsConfirmingRemove(false)}>×</button>
          </header>
          <div className="confirm-popover-body">
            <p>
              {t('admin.groups.removeConfirmText', { count: selectedMemberIds.length, name: group.name })}
            </p>
            <span>{t('admin.groups.removeConfirmHelp')}</span>
          </div>
          <footer className="confirm-popover-actions">
            <button className="btn-cancel flat" type="button" onClick={() => setIsConfirmingRemove(false)} disabled={isRemoving}>
              {t('common.cancel')}
            </button>
            <button className="btn-danger-solid" type="button" onClick={handleRemoveMembers} disabled={isRemoving}>
              {isRemoving ? t('admin.groups.removing') : t('admin.groups.removeMembers')}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

export default GroupMembersModal;
