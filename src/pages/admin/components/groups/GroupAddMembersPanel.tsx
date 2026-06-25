import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { addGroupMembers, type GroupMemberDto } from '@/services/group.service';
import { getUsers, type UserListItemDto } from '@/services/user.service';
import type { GroupViewModel } from './group-view-model';

type GroupAddMembersPanelProps = {
  group: GroupViewModel;
  currentMemberIds: string[];
  onBack: () => void;
  onMembersAdded: (group: GroupMemberDto) => void;
};

function GroupAddMembersPanel({ group, currentMemberIds, onBack, onMembersAdded }: GroupAddMembersPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [users, setUsers] = useState<UserListItemDto[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserListItemDto[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadUsers() {
      setIsLoadingUsers(true);

      try {
        const result = await getUsers(1, 100);
        if (!ignore) {
          setUsers(result.users);
        }
      } catch (err) {
        if (!ignore) {
          toast.error(err instanceof Error ? err.message : t('admin.users.loadFailed'));
        }
      } finally {
        if (!ignore) {
          setIsLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [t, toast]);

  useEffect(() => {
    setSelectedUsers([]);
    setSearch('');
  }, [group]);

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(selectedUsers.map((user) => user.id));
    const memberIds = new Set(currentMemberIds);
    const keyword = search.trim().toLowerCase();

    return users
      .filter((user) => !selectedIds.has(user.id))
      .filter((user) => !memberIds.has(user.id))
      .filter((user) => {
        if (!keyword) return true;
        return `${user.fullName} ${user.email}`.toLowerCase().includes(keyword);
      })
      .slice(0, 6);
  }, [currentMemberIds, search, selectedUsers, users]);

  function addSelectedUser(user: UserListItemDto) {
    setSelectedUsers((current) => [...current, user]);
    setSearch('');
  }

  function removeSelectedUser(userId: string) {
    setSelectedUsers((current) => current.filter((user) => user.id !== userId));
  }

  async function handleAddMembers() {
    if (selectedUsers.length === 0) {
      toast.error(t('admin.groups.selectAtLeastOneUser'));
      return;
    }

    setIsAdding(true);

    try {
      const updatedGroup = await addGroupMembers(group.id, selectedUsers.map((user) => user.id));
      toast.success(t('admin.groups.usersAdded', { count: selectedUsers.length, name: group.name }));
      setSelectedUsers([]);
      setSearch('');
      onMembersAdded(updatedGroup);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.groups.addUsersFailed');
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="add-members-page">
      <div className="member-section-header">
        <div>
          <p className="form-kicker">{t('admin.groups.addMembers')}</p>
          <span className="member-selection-count">{t('common.selected', { count: selectedUsers.length })}</span>
        </div>
        <div className="member-section-actions">
          <button className="btn-cancel flat" type="button" onClick={onBack}>{t('common.back')}</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleAddMembers} disabled={isAdding}>
            {isAdding ? t('admin.users.adding') : t('admin.groups.addSelected')}
          </button>
        </div>
      </div>

      <label className="member-search-field">
        {t('admin.groups.searchUser')}
        <input
          placeholder={isLoadingUsers ? t('admin.users.loadingUsers') : t('admin.groups.searchUsersPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={isLoadingUsers}
        />
      </label>

      <div className="member-picker-list">
        {availableUsers.map((user) => (
          <button type="button" key={user.id} onClick={() => addSelectedUser(user)}>
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </button>
        ))}
        {!isLoadingUsers && availableUsers.length === 0 && (
          <span className="muted">{t('admin.groups.noAvailableUsers')}</span>
        )}
      </div>

      <p className="form-kicker">{t('admin.groups.selectedNewMembers')}</p>
      <div className="tag-row">
        {selectedUsers.length > 0 ? (
          selectedUsers.map((user) => (
            <button className="tag tag-button" type="button" key={user.id} onClick={() => removeSelectedUser(user.id)}>
              {user.fullName} x
            </button>
          ))
        ) : (
          <span className="muted">{t('admin.groups.noUsersSelected')}</span>
        )}
      </div>
    </section>
  );
}

export default GroupAddMembersPanel;
