import { PermissionConstant } from './permission.constant';

export const permissionPolicy = {
  navigation: {
    users: [PermissionConstant.USER_READ],
    groups: [PermissionConstant.GROUP_READ],
  },
  pages: {
    users: PermissionConstant.USER_READ,
    groups: PermissionConstant.GROUP_READ,
  },
  actions: {
    users: {
      add: PermissionConstant.USER_CREATE,
      update: PermissionConstant.USER_UPDATE,
      delete: PermissionConstant.USER_DELETE,
      assignGroup: PermissionConstant.USER_UPDATE,
    },
    groups: {
      create: PermissionConstant.GROUP_CREATE,
      update: PermissionConstant.GROUP_UPDATE,
      members: PermissionConstant.GROUP_UPDATE,
      delete: PermissionConstant.GROUP_DELETE,
    },
  },
} as const;
