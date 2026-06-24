import { useMemo, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import type { GroupListItemDto } from '@/services/group.service';
import { assignUserGroups } from '@/services/user.service';

type UserAssignGroupModalProps = {
  groups: GroupListItemDto[];
  userIds: string[];
  onClose: () => void;
  onAssigned: () => void;
};

function UserAssignGroupModal({ groups, userIds, onClose, onAssigned }: UserAssignGroupModalProps) {
  const toast = useToast();
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedGroupIds = useMemo(() => new Set(groupIds), [groupIds]);

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return groups.filter((group) => {
      if (!keyword) return true;
      return `${group.name} ${group.description ?? ''}`.toLowerCase().includes(keyword);
    });
  }, [groups, search]);

  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedGroupIds.has(group.id)),
    [groups, selectedGroupIds]
  );

  function toggleGroup(groupId: string) {
    setGroupIds((current) => (
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    ));
  }

  function removeGroup(groupId: string) {
    setGroupIds((current) => current.filter((id) => id !== groupId));
  }

  async function handleSubmit() {
    if (groupIds.length === 0) {
      toast.error('Please select at least one group');
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.all(userIds.map((userId) => assignUserGroups(userId, groupIds)));
      toast.success(`${userIds.length} user${userIds.length > 1 ? 's' : ''} added to ${groupIds.length} group${groupIds.length > 1 ? 's' : ''}.`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot assign users to group');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card user-modal compact-modal">
        <header className="modal-header stacked">
          <div>
            <h2>Add to Groups</h2>
            <p>Select groups for {userIds.length} selected user{userIds.length > 1 ? 's' : ''}.</p>
          </div>
          <button type="button" aria-label="Close add to group" onClick={onClose}>x</button>
        </header>

        <div className="modal-body">
          <label>
            Search Group
            <input
              placeholder="Search by group name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
                <span>{group.description ?? `${group.memberCount} members`}</span>
              </button>
            ))}
            {filteredGroups.length === 0 && <span className="muted">No groups found</span>}
          </div>

          <p className="form-kicker">Selected Groups</p>
          <div className="tag-row">
            {selectedGroups.length > 0 ? (
              selectedGroups.map((group) => (
                <button className="tag tag-button" type="button" key={group.id} onClick={() => removeGroup(group.id)}>
                  {group.name} x
                </button>
              ))
            ) : (
              <span className="muted">No groups selected</span>
            )}
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn-cancel flat" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-xl" type="button" onClick={handleSubmit} disabled={isSubmitting || groupIds.length === 0}>
            {isSubmitting ? 'Adding...' : 'Add to Groups'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default UserAssignGroupModal;
