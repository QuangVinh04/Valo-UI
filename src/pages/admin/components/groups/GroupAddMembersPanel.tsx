import { useEffect, useMemo, useState } from 'react';
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
          toast.error(err instanceof Error ? err.message : 'Cannot load users');
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
  }, [toast]);

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
      toast.error('Please select at least one user');
      return;
    }

    setIsAdding(true);

    try {
      const updatedGroup = await addGroupMembers(group.id, selectedUsers.map((user) => user.id));
      toast.success(`${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} added to "${group.name}".`);
      setSelectedUsers([]);
      setSearch('');
      onMembersAdded(updatedGroup);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cannot add users to group';
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <section className="add-members-page">
      <div className="member-section-header">
        <div>
          <p className="form-kicker">Add Members</p>
          <span className="member-selection-count">{selectedUsers.length} selected</span>
        </div>
        <div className="member-section-actions">
          <button className="btn-cancel flat" type="button" onClick={onBack}>Back</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleAddMembers} disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Selected'}
          </button>
        </div>
      </div>

      <label className="member-search-field">
        Search User
        <input
          placeholder={isLoadingUsers ? 'Loading users...' : 'Search by name or email'}
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
          <span className="muted">No available users found</span>
        )}
      </div>

      <p className="form-kicker">Selected New Members</p>
      <div className="tag-row">
        {selectedUsers.length > 0 ? (
          selectedUsers.map((user) => (
            <button className="tag tag-button" type="button" key={user.id} onClick={() => removeSelectedUser(user.id)}>
              {user.fullName} x
            </button>
          ))
        ) : (
          <span className="muted">No users selected</span>
        )}
      </div>
    </section>
  );
}

export default GroupAddMembersPanel;
