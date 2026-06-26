import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import { handleServiceError } from './service-error.helper';
import type { ApiMeta, ApiResponse } from '@/types/api.type';
import type { UserSettings, UserSettingsInput } from '@/context/PreferencesContext';
import type {
  CreatedUserDto,
  CreateUserPayload,
  UpdateUserPayload,
  UserDto,
  UserListFilters,
  UserListItemDto,
  UserProfileDto,
  UserProfileUpdate,
} from '@/types/user.type';

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  try {
    const response = await api.patch<ApiResponse<UserSettings>>('/users/settings', settings);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function updateCurrentUserProfile(userId: string, payload: UserProfileUpdate): Promise<UserProfileDto> {
  try {
    const response = await api.put<ApiResponse<UserProfileDto>>(`/users/${userId}`, payload);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getCurrentUser(): Promise<UserDto> {
  try {
    const response = await api.get<ApiResponse<UserDto>>('/users/me');
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
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

  try {
    const response = await api.get<ApiResponse<UserListItemDto[]>>(`/users?${params.toString()}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return {
      users: response.data.data,
      meta: response.data.meta ?? null,
    };
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getUserById(userId: string): Promise<UserDto> {
  try {
    const response = await api.get<ApiResponse<UserDto>>(`/users/${userId}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function createUser(payload: CreateUserPayload): Promise<CreatedUserDto> {
  try {
    const response = await api.post<ApiResponse<CreatedUserDto>>('/users', payload);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<UserProfileDto> {
  try {
    const response = await api.put<ApiResponse<UserProfileDto>>(`/users/${userId}`, payload);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function assignUserGroups(userId: string, groupIds: string[]): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<boolean>>(`/users/${userId}/groups`, { groupIds });
    if (!response.data.success || response.data.data === null) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<null>>(`/users/${userId}`);
    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } catch (error) {
    handleServiceError(error);
  }
}
