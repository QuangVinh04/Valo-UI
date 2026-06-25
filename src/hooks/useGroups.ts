import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { getGroupById, getGroupMembers, getGroups, type GroupListItemDto } from '@/services/group.service';
import { toGroupViewModel, type GroupViewModel } from '@/pages/admin/components/groups/group-view-model';
import { usePermissions } from './usePermissions';

export type GroupModalAction = 'create' | 'details' | 'update' | 'members' | 'delete';

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

export function useGroups() {
  const permissions = usePermissions();
  const toast = useToast();
  const canReadGroups = permissions.can('GROUP_R');
  const [modal, setModal] = useState<GroupModalAction | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModel | null>(null);
  const [groups, setGroups] = useState<GroupListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingGroupId, setOpeningGroupId] = useState<string | null>(null);

  const showPermissionNotice = useCallback((permission: string) => {
    const message = permissionMessages[permission] ?? 'You do not have permission for this action.';
    toast.warning(message);
  }, [toast]);

  const loadGroups = useCallback(async () => {
    if (permissions.cannot('GROUP_R')) {
      setGroups([]);
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
  }, [permissions, toast]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  function openCreateModal() {
    const requiredPermission = groupActionPermissions.create;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    setModal('create');
  }

  async function openGroupModal(action: Exclude<GroupModalAction, 'create'>, group: GroupViewModel) {
    if (action === 'details' && permissions.cannot('GROUP_R')) {
      showPermissionNotice('GROUP_R');
      return;
    }

    if (action !== 'details') {
      const requiredPermission = groupActionPermissions[action];
      if (permissions.cannot(requiredPermission)) {
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

  return {
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
  };
}
