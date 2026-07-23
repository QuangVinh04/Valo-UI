export const PermissionConstant = {
  USER_READ: 'USER_R',
  USER_CREATE: 'USER_C',
  USER_UPDATE: 'USER_U',
  USER_DELETE: 'USER_D',
  CHAT: 'CHAT',
  CONV_CREATE: 'CONV_C',
  CONV_READ: 'CONV_R',
  CONV_UPDATE: 'CONV_U',
  CONV_DELETE: 'CONV_D',
  GROUP_READ: 'GROUP_R',
  GROUP_CREATE: 'GROUP_C',
  GROUP_UPDATE: 'GROUP_U',
  GROUP_DELETE: 'GROUP_D',
  GROUP_ADD_USER: 'GROUP_ADD_USER',
  GROUP_DELETE_USER: 'GROUP_DELETE_USER',
} as const;

export type PermissionKey = typeof PermissionConstant[keyof typeof PermissionConstant];

export const PermissionKeys = Object.values(PermissionConstant) as PermissionKey[];
export const PermissionKeySet = new Set<PermissionKey>(PermissionKeys);

export function isPermissionKey(value: string): value is PermissionKey {
  return PermissionKeySet.has(value as PermissionKey);
}
