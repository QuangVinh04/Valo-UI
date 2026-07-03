import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { deleteGroups, getGroupById, getGroupMembers, getGroups } from '@/services/group.service';
import type { GroupListItemDto } from '@/types/group.type';
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isDeletingSelectedGroups, setIsDeletingSelectedGroups] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const showPermissionNotice = useCallback((permission: string) => {
    toast.warning(t(permissionMessages[permission] ?? 'common.noPagePermission'));
  }, [t, toast]);

  // Tải danh sách nhóm sau khi xác nhận người dùng có quyền xem nhóm.
  const loadGroups = useCallback(async (targetPage = page) => {
    if (permissions.cannot('GROUP_R')) {
      setGroups([]);
      setSelectedGroupIds([]);
      setTotalItems(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await getGroups(targetPage, limit, activeSearch);
      setGroups(result.groups);
      setSelectedGroupIds([]);
      setTotalItems(result.meta?.totalItems ?? result.groups.length);
      setTotalPages(result.meta?.totalPages ?? 1);
      setPage(result.meta?.page ?? targetPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.groups.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [activeSearch, limit, page, permissions, t, toast]);

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

  function setSearch(value: string) {
    setSearchInput(value);

    if (!value.trim()) {
      setActiveSearch('');
      setPage(1);
    }
  }

  function applySearch() {
    setActiveSearch(search.trim());
    setPage(1);
  }

  function goToPage(targetPage: number) {
    const nextPage = Math.min(Math.max(targetPage, 1), totalPages);
    if (nextPage === page || isLoading) return;

    setPage(nextPage);
  }

  function toggleSelectedGroup(groupId: string) {
    setSelectedGroupIds((current) => (
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    ));
  }

  function toggleAllGroups(visibleGroupIds: string[]) {
    setSelectedGroupIds((current) => (
      current.length === visibleGroupIds.length ? [] : visibleGroupIds
    ));
  }

  async function deleteSelectedGroups() {
    const requiredPermission = groupActionPermissions.delete;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    if (selectedGroupIds.length === 0) {
      toast.warning(t('admin.groups.selectAtLeastOneGroup'));
      return;
    }

    setIsDeletingSelectedGroups(true);

    try {
      const result = await deleteGroups(selectedGroupIds);
      toast.success(t('admin.groups.deletedSelected', { count: result.deletedCount }));
      await loadGroups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.groups.deleteFailed'));
    } finally {
      setIsDeletingSelectedGroups(false);
    }
  }

  return {
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
    toggleAllGroups,
    deleteSelectedGroups,
  };
}
