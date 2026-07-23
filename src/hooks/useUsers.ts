import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { getGroups } from '@/services/group.service';
import type { GroupListItemDto } from '@/types/group.type';
import { deleteUsers, getUserById, getUsers } from '@/services/user.service';
import type { UserDto, UserListItemDto } from '@/types/user.type';
import { usePermissions } from './usePermissions';
import { PermissionConstant, type PermissionKey } from '@/constants/permission.constant';
import { permissionDeniedMessages } from '@/constants/permission-denied-messages';

export type UserModalAction = 'details' | 'add' | 'update' | 'delete' | 'assignGroup';

export type UserFilters = {
  search: string;
  groupId: string;
  status: 'all' | 'active' | 'inactive';
};

export const defaultUserFilters: UserFilters = {
  search: '',
  groupId: '',
  status: 'all',
};

const userActionPermissions: Record<Exclude<UserModalAction, 'details'>, PermissionKey> = {
  add: PermissionConstant.USER_CREATE,
  update: PermissionConstant.USER_UPDATE,
  delete: PermissionConstant.USER_DELETE,
  assignGroup: PermissionConstant.USER_UPDATE,
};

const permissionMessages: Record<string, string> = {
  ...permissionDeniedMessages,
};

export function useUsers() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const toast = useToast();
  const canReadUsers = permissions.can(PermissionConstant.USER_READ);
  const canCreateUsers = permissions.can(PermissionConstant.USER_CREATE);
  const canUpdateUsers = permissions.can(PermissionConstant.USER_UPDATE);
  const canDeleteUsers = permissions.can(PermissionConstant.USER_DELETE);
  const [modal, setModal] = useState<UserModalAction | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);
  const [users, setUsers] = useState<UserListItemDto[]>([]);
  const [groups, setGroups] = useState<GroupListItemDto[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [isDeletingSelectedUsers, setIsDeletingSelectedUsers] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<UserFilters>(defaultUserFilters);
  const [activeFilters, setActiveFilters] = useState<UserFilters>(defaultUserFilters);

  // Chuẩn hóa bộ lọc trên UI thành query gửi lên API.
  const userQueryFilters = useMemo(() => ({
    search: activeFilters.search.trim() || undefined,
    groupId: activeFilters.groupId || undefined,
    active: activeFilters.status === 'all'
      ? undefined
      : activeFilters.status === 'active',
  }), [activeFilters]);

  const showPermissionNotice = useCallback((permission: PermissionKey) => {
    toast.warning(t(permissionMessages[permission] ?? 'common.noPagePermission'));
  }, [t, toast]);

  // Tải lại danh sách người dùng theo trang hiện tại và bộ lọc đang áp dụng.
  const loadUsers = useCallback(async (targetPage = page) => {
    if (!permissions.can(PermissionConstant.USER_READ)) {
      setUsers([]);
      setTotalItems(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const result = await getUsers(targetPage, limit, userQueryFilters);
      setUsers(result.users);
      setSelectedUserIds([]);
      setTotalItems(result.meta?.totalItems ?? result.users.length);
      setTotalPages(result.meta?.totalPages ?? 1);
      setPage(result.meta?.page ?? targetPage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.users.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [limit, page, permissions, t, toast, userQueryFilters]);

  useEffect(() => {
    let ignore = false;

    // Lần tải đầu cần lấy cả danh sách người dùng và nhóm để phục vụ bộ lọc/gán nhóm.
    async function loadInitialData() {
      if (!permissions.can(PermissionConstant.USER_READ)) {
        setUsers([]);
        setTotalItems(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [userResult, groupResult] = await Promise.all([
          getUsers(page, limit, userQueryFilters),
          getGroups().then((result) => result.groups).catch(() => [] as GroupListItemDto[]),
        ]);

        if (ignore) return;

        setUsers(userResult.users);
        setSelectedUserIds([]);
        setTotalItems(userResult.meta?.totalItems ?? userResult.users.length);
        setTotalPages(userResult.meta?.totalPages ?? 1);
        setPage(userResult.meta?.page ?? page);
        setGroups(groupResult);
      } catch (err) {
        if (!ignore) {
          toast.error(err instanceof Error ? err.message : t('admin.users.loadFailed'));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      ignore = true;
    };
  }, [limit, page, permissions, t, toast, userQueryFilters]);

  function openAddModal() {
    // Chặn mở modal nếu người dùng hiện tại không có quyền tạo tài khoản.
    const requiredPermission = userActionPermissions.add;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    setSelectedUser(null);
    setModal('add');
  }

  function openAssignGroupModal() {
    // Gán nhóm là thao tác cập nhật người dùng nên dùng quyền USER_U.
    const requiredPermission = userActionPermissions.assignGroup;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.warning(t('admin.users.selectUserFirst'));
      return;
    }

    setModal('assignGroup');
  }

  async function openUserModal(action: Exclude<UserModalAction, 'add' | 'assignGroup'>, user: UserListItemDto) {
    // Mỗi modal cần dữ liệu chi tiết mới nhất để tránh sửa/xóa trên dữ liệu danh sách bị cũ.
    if (action === 'details' && permissions.cannot(PermissionConstant.USER_READ)) {
      showPermissionNotice(PermissionConstant.USER_READ);
      return;
    }

    if (action !== 'details') {
      const requiredPermission = userActionPermissions[action];
      if (permissions.cannot(requiredPermission)) {
        showPermissionNotice(requiredPermission);
        return;
      }
    }

    setOpeningUserId(user.id);

    try {
      const fullUser = await getUserById(user.id);
      setSelectedUser(fullUser);
      setModal(action);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.users.loadDetailsFailed'));
    } finally {
      setOpeningUserId(null);
    }
  }

  function closeModal() {
    // Đóng modal đồng thời xóa bản ghi đang chọn để lần mở sau không dùng dữ liệu cũ.
    setModal(null);
    setSelectedUser(null);
  }

  function goToPage(targetPage: number) {
    // Giữ số trang trong giới hạn hợp lệ và tránh đổi trang khi đang tải.
    const nextPage = Math.min(Math.max(targetPage, 1), totalPages);
    if (nextPage === page || isLoading) return;

    setPage(nextPage);
  }

  function toggleSelectedUser(userId: string) {
    // Bật/tắt chọn một người dùng trong danh sách hiện tại.
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  function toggleAllUsers(visibleUserIds: string[]) {
    // Nếu đã chọn toàn bộ hàng đang hiển thị thì bỏ chọn, ngược lại chọn tất cả.
    setSelectedUserIds((current) => (
      current.length === visibleUserIds.length ? [] : visibleUserIds
    ));
  }

  async function deleteSelectedUsers() {
    const requiredPermission = userActionPermissions.delete;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.warning(t('admin.users.selectUserFirst'));
      return;
    }

    setIsDeletingSelectedUsers(true);

    try {
      const result = await deleteUsers(selectedUserIds);
      toast.success(t('admin.users.deletedSelected', { count: result.deletedCount }));
      await loadUsers(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('admin.users.deleteFailed'));
    } finally {
      setIsDeletingSelectedUsers(false);
    }
  }

  function applyFilters() {
    // Chỉ áp dụng bộ lọc khi người dùng bấm nút, sau đó quay về trang đầu.
    setActiveFilters(filterDraft);
    setPage(1);
  }

  function clearFilters() {
    // Đưa cả bộ lọc nháp và bộ lọc đang áp dụng về mặc định.
    setFilterDraft(defaultUserFilters);
    setActiveFilters(defaultUserFilters);
    setPage(1);
  }

  return {
    modal,
    selectedUser,
    users,
    groups,
    totalItems,
    page,
    limit,
    totalPages,
    isLoading,
    selectedUserIds,
    openingUserId,
    isDeletingSelectedUsers,
    isFilterPanelOpen,
    filterDraft,
    activeFilters,
    canReadUsers,
    canCreateUsers,
    canUpdateUsers,
    canDeleteUsers,
    setIsFilterPanelOpen,
    setFilterDraft,
    loadUsers,
    openAddModal,
    openAssignGroupModal,
    openUserModal,
    closeModal,
    goToPage,
    toggleSelectedUser,
    toggleAllUsers,
    deleteSelectedUsers,
    applyFilters,
    clearFilters,
  };
}
