import { apiRequest, apiRequestWithMeta, type ApiMeta } from '@/lib/api';
import type { UserSettings, UserSettingsInput } from '@/context/PreferencesContext';

export type UserDto = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  address: string | null;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserListItemDto = {
  id: string;
  fullName: string;
  email: string;
  groups: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
};

export type UserProfileUpdate = {
  phoneNumber?: string;
  address?: string;
};

export type UserListFilters = {
  search?: string;
  groupId?: string;
  mustChangePassword?: boolean;
};

export type CreateUserPayload = {
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
};

export type UpdateUserPayload = {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
};

export type CreatedUserDto = {
  id: string;
};

export type UserProfileDto = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  address: string | null;
  settings: UserSettingsInput;
};

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  return apiRequest<UserSettings>('/users/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function updateCurrentUserProfile(payload: UserProfileUpdate): Promise<UserProfileDto> {
  return apiRequest<UserProfileDto>('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(): Promise<UserDto> {
  return apiRequest<UserDto>('/users/me');
}

export async function getUsers(page = 1, limit = 10, filters: UserListFilters = {}): Promise<{ users: UserListItemDto[]; meta: ApiMeta | null }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const search = filters.search?.trim();
  if (search) {
    params.set('search', search);
  }

  if (filters.groupId) {
    params.set('groupId', filters.groupId);
  }

  if (filters.mustChangePassword !== undefined) {
    params.set('mustChangePassword', String(filters.mustChangePassword));
  }

  const result = await apiRequestWithMeta<UserListItemDto[]>(`/users?${params.toString()}`);

  return {
    users: result.data,
    meta: result.meta,
  };
}

export async function getUserById(userId: string): Promise<UserDto> {
  return apiRequest<UserDto>(`/users/${userId}`);
}

export async function createUser(payload: CreateUserPayload): Promise<CreatedUserDto> {
  return apiRequest<CreatedUserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<boolean> {
  return apiRequest<boolean>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function assignUserGroups(userId: string, groupIds: string[]): Promise<boolean> {
  return apiRequest<boolean>(`/users/${userId}/groups`, {
    method: 'POST',
    body: JSON.stringify({ groupIds }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await apiRequest<null>(`/users/${userId}`, {
    method: 'DELETE',
  });
}
