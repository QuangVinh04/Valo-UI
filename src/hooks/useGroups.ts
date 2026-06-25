import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  GROUP_R: 'admin.groups.cannotViewDetails',
  GROUP_C: 'admin.groups.cannotCreate',
  GROUP_U: 'admin.groups.cannotUpdate',
  GROUP_D: 'admin.groups.cannotDelete',
};

export function useGroups() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const toast = useToast();
  const canReadGroups = permissions.can('GROUP_R');
  const [modal, setModal] = useState<GroupModalAction | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModel | null>(null);
  const [groups, setGroups] = useState<GroupListItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingGroupId, setOpeningGroupId] = useState<string | null>(null);

  const showPermissionNotice = useCallback((permission: string) => {
    toast.warning(t(permissionMessages[permission] ?? 'common.noPagePermission'));
  }, [t, toast]);

  // Tải danh sách nhóm sau khi xác nhận người dùng có quyền xem nhóm.
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
      toast.error(err instanceof Error ? err.message : t('admin.groups.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [permissions, t, toast]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  function openCreateModal() {
    // Chỉ mở modal tạo nhóm khi có quyền GROUP_C.
    const requiredPermission = groupActionPermissions.create;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    setModal('create');
  }

  async function openGroupModal(action: Exclude<GroupModalAction, 'create'>, group: GroupViewModel) {
    // Kiểm tra quyền theo từng loại thao tác trước khi tải dữ liệu chi tiết.
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
      // Xóa nhóm chỉ cần dữ liệu dòng hiện tại để xác nhận tên nhóm.
      setSelectedGroup(group);
      setModal(action);
      return;
    }

    try {
      setOpeningGroupId(group.id);

      if (action === 'members') {
        // Modal thành viên cần danh sách user trong nhóm thay vì chỉ thông tin nhóm.
        const memberGroup = await getGroupMembers(group.id);
        setSelectedGroup(toGroupViewModel({ ...group, ...memberGroup }));
      } else {
        // Modal chi tiết cần ghép thông tin nhóm và thành viên để hiển thị đầy đủ.
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
      toast.error(err instanceof Error ? err.message : t('admin.groups.loadDetailsFailed'));
    } finally {
      setOpeningGroupId(null);
    }
  }

  function closeModal() {
    // Xóa nhóm đang chọn để tránh giữ dữ liệu của modal trước.
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
