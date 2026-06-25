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
  // Đồng bộ tùy chọn giao diện/ngôn ngữ của người dùng lên backend.
  return apiRequest<UserSettings>('/users/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function updateCurrentUserProfile(payload: UserProfileUpdate): Promise<UserProfileDto> {
  // Cập nhật hồ sơ cá nhân đang đăng nhập từ màn hình Settings.
  return apiRequest<UserProfileDto>('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(): Promise<UserDto> {
  // Lấy thông tin người dùng hiện tại để hydrate phiên đăng nhập và hồ sơ.
  return apiRequest<UserDto>('/users/me');
}

export async function getUsers(page = 1, limit = 10, filters: UserListFilters = {}): Promise<{ users: UserListItemDto[]; meta: ApiMeta | null }> {
  // Dựng query phân trang/bộ lọc đúng chuẩn API để màn hình Users chỉ nhận dữ liệu cần hiển thị.
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
  // Lấy chi tiết một người dùng trước khi xem, sửa, xóa hoặc gán quyền liên quan.
  return apiRequest<UserDto>(`/users/${userId}`);
}

export async function createUser(payload: CreateUserPayload): Promise<CreatedUserDto> {
  // Tạo người dùng mới; backend sẽ xử lý mật khẩu tạm thời theo nghiệp vụ.
  return apiRequest<CreatedUserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<boolean> {
  // Cập nhật thông tin cơ bản của người dùng từ modal quản trị.
  return apiRequest<boolean>(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function assignUserGroups(userId: string, groupIds: string[]): Promise<boolean> {
  // Gán lại danh sách nhóm cho một người dùng trong luồng quản trị.
  return apiRequest<boolean>(`/users/${userId}/groups`, {
    method: 'POST',
    body: JSON.stringify({ groupIds }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  // Xóa người dùng sau khi modal xác nhận đã kiểm tra quyền và điều kiện nhập.
  await apiRequest<null>(`/users/${userId}`, {
    method: 'DELETE',
  });
}
