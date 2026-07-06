import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import type { GroupListItemDto } from '@/types/group.type';
import { assignUserGroups } from '@/services/user.service';

type UserAssignGroupModalProps = {
  groups: GroupListItemDto[];
  userIds: string[];
  onClose: () => void;
  onAssigned: () => void;
};

function UserAssignGroupModal({
  groups,
  userIds,
  onClose,
  onAssigned,
}: UserAssignGroupModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGroupIds = useMemo(() => new Set(groupIds), [groupIds]);

  const keyword = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!keyword) {
      return [];
    }

    return groups.filter((group) =>
      `${group.name} ${group.description ?? ''}`
        .toLowerCase()
        .includes(keyword),
    );
  }, [groups, keyword]);

  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedGroupIds.has(group.id)),
    [groups, selectedGroupIds],
  );

  function toggleGroup(groupId: string) {
    setGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  function removeGroup(groupId: string) {
    setGroupIds((current) => current.filter((id) => id !== groupId));
  }

  async function handleSubmit() {
    if (groupIds.length === 0) {
      toast.error(t('admin.users.selectAtLeastOneGroup'));
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.all(
        userIds.map((userId) => assignUserGroups(userId, groupIds)),
      );

      toast.success(
        t('admin.users.assignedToGroups', {
          count: userIds.length,
          users: userIds.length,
          groups: groupIds.length,
        }),
      );

      onAssigned();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('admin.users.assignFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const shouldShowSearchHint = !keyword;
  const shouldShowEmptyResult = keyword && filteredGroups.length === 0;

  return (
    <div className="modal-backdrop" onClick={() => { if (!isSubmitting) onClose(); }}>
      <section className="modal-card user-modal compact-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header stacked">
          <div>
            <h2>{t('admin.users.addToGroupsTitle')}</h2>
            <p>{t('admin.users.selectGroupsFor', { count: userIds.length })}</p>
          </div>

          <button
            type="button"
            aria-label={t('admin.users.closeAddToGroup')}
            onClick={onClose}
          >
            x
          </button>
        </header>

        <div className="modal-body">
          <label>
            {t('admin.users.searchGroup')}
            <input
              placeholder={t('admin.users.searchGroupPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <div className="member-picker-list">
            {filteredGroups.map((group) => (
              <button
                type="button"
                className={selectedGroupIds.has(group.id) ? 'selected' : undefined}
                key={group.id}
                onClick={() => toggleGroup(group.id)}
              >
                <strong>{group.name}</strong>
                <span>
                  {group.description ??
                    t('admin.groups.membersCount', {
                      count: group.memberCount,
                    })}
                </span>
              </button>
            ))}

            {shouldShowSearchHint && (
              <span className="muted">
                {t('admin.users.typeToSearchGroups')}
              </span>
            )}

            {shouldShowEmptyResult && (
              <span className="muted">{t('admin.users.noGroupsFound')}</span>
            )}
          </div>

          <p className="form-kicker">{t('admin.users.selectedGroups')}</p>

          <div className="tag-row">
            {selectedGroups.length > 0 ? (
              selectedGroups.map((group) => (
                <button
                  className="tag tag-button"
                  type="button"
                  key={group.id}
                  onClick={() => removeGroup(group.id)}
                >
                  {group.name} x
                </button>
              ))
            ) : (
              <span className="muted">{t('admin.users.noGroupsSelected')}</span>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <button
            className="btn-cancel"
            type="button"
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>

          <button
            className="btn-primary btn-xl"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || groupIds.length === 0}
          >
            {isSubmitting
              ? t('admin.users.adding')
              : t('common.add')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserAssignGroupModal;
