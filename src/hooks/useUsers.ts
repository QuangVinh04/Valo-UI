import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { getGroups, type GroupListItemDto } from '@/services/group.service';
import { getUserById, getUsers, type UserDto, type UserListItemDto } from '@/services/user.service';
import { usePermissions } from './usePermissions';

export type UserModalAction = 'details' | 'add' | 'update' | 'delete' | 'assignGroup';

export type UserFilters = {
  search: string;
  groupId: string;
  mustChangePassword: 'all' | 'true' | 'false';
};

export const defaultUserFilters: UserFilters = {
  search: '',
  groupId: '',
  mustChangePassword: 'all',
};

const userActionPermissions: Record<Exclude<UserModalAction, 'details'>, string> = {
  add: 'USER_C',
  update: 'USER_U',
  delete: 'USER_D',
  assignGroup: 'USER_U',
};

const permissionMessages: Record<string, string> = {
  USER_R: 'admin.users.cannotViewDetails',
  USER_C: 'admin.users.cannotCreate',
  USER_U: 'admin.users.cannotUpdate',
  USER_D: 'admin.users.cannotDelete',
};

export function useUsers() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const toast = useToast();
  const canReadUsers = permissions.can('USER_R');
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
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<UserFilters>(defaultUserFilters);
  const [activeFilters, setActiveFilters] = useState<UserFilters>(defaultUserFilters);

  const userQueryFilters = useMemo(() => ({
    search: activeFilters.search.trim() || undefined,
    groupId: activeFilters.groupId || undefined,
    mustChangePassword: activeFilters.mustChangePassword === 'all'
      ? undefined
      : activeFilters.mustChangePassword === 'true',
  }), [activeFilters]);

  const showPermissionNotice = useCallback((permission: string) => {
    toast.warning(t(permissionMessages[permission] ?? 'common.noPagePermission'));
  }, [t, toast]);

  const loadUsers = useCallback(async (targetPage = page) => {
    if (!permissions.can('USER_R')) {
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

    async function loadInitialData() {
      if (!permissions.can('USER_R')) {
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
          getGroups().catch(() => [] as GroupListItemDto[]),
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
    const requiredPermission = userActionPermissions.add;
    if (permissions.cannot(requiredPermission)) {
      showPermissionNotice(requiredPermission);
      return;
    }

    setSelectedUser(null);
    setModal('add');
  }

  function openAssignGroupModal() {
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
    if (action === 'details' && permissions.cannot('USER_R')) {
      showPermissionNotice('USER_R');
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
    setModal(null);
    setSelectedUser(null);
  }

  function goToPage(targetPage: number) {
    const nextPage = Math.min(Math.max(targetPage, 1), totalPages);
    if (nextPage === page || isLoading) return;

    setPage(nextPage);
  }

  function toggleSelectedUser(userId: string) {
    setSelectedUserIds((current) => (
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    ));
  }

  function toggleAllUsers(visibleUserIds: string[]) {
    setSelectedUserIds((current) => (
      current.length === visibleUserIds.length ? [] : visibleUserIds
    ));
  }

  function applyFilters() {
    setActiveFilters(filterDraft);
    setPage(1);
  }

  function clearFilters() {
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
    isFilterPanelOpen,
    filterDraft,
    activeFilters,
    canReadUsers,
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
    applyFilters,
    clearFilters,
  };
}
