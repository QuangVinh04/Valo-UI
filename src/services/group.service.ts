import { apiRequest, apiRequestWithMeta } from '@/lib/api';

export type GroupListItemDto = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
};

export type GroupDto = GroupListItemDto & {
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type GroupMemberDto = {
  id: string;
  name: string;
  memberCount: number;
  members: Array<{
    id: string;
    fullName: string;
    email: string;
  }>;
};

export type CreatedGroupDto = {
  id: string;
};

export type CreateGroupPayload = {
  name: string;
  description?: string;
  permissions?: string[];
};

export type UpdateGroupPayload = Partial<CreateGroupPayload>;

export async function getGroups(page = 1, limit = 100): Promise<GroupListItemDto[]> {
  // Lấy danh sách nhóm dùng cho trang Groups và các dropdown chọn nhóm.
  const result = await apiRequestWithMeta<GroupListItemDto[]>(`/groups?page=${page}&limit=${limit}`);
  return result.data;
}

export async function getGroupById(groupId: string): Promise<GroupDto> {
  // Lấy chi tiết nhóm trước khi xem hoặc cập nhật quyền.
  return apiRequest<GroupDto>(`/groups/${groupId}`);
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberDto> {
  // Lấy danh sách thành viên để modal quản lý thành viên hiển thị dữ liệu mới nhất.
  return apiRequest<GroupMemberDto>(`/groups/${groupId}/users`);
}

export async function createGroup(payload: CreateGroupPayload): Promise<CreatedGroupDto> {
  // Tạo nhóm mới cùng bộ quyền đã chọn từ UI.
  return apiRequest<CreatedGroupDto>('/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGroup(groupId: string, payload: UpdateGroupPayload): Promise<GroupDto> {
  // Cập nhật tên, mô tả hoặc quyền của nhóm.
  return apiRequest<GroupDto>(`/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function addGroupMembers(groupId: string, userIds: string[]): Promise<GroupMemberDto> {
  // Thêm nhiều người dùng vào nhóm và nhận lại danh sách thành viên sau cập nhật.
  return apiRequest<GroupMemberDto>(`/groups/${groupId}/users`, {
    method: 'POST',
    body: JSON.stringify({ userIds }),
  });
}

export async function removeGroupMembers(groupId: string, userIds: string[]): Promise<GroupMemberDto> {
  // Gỡ nhiều người dùng khỏi nhóm và nhận lại danh sách thành viên sau cập nhật.
  return apiRequest<GroupMemberDto>(`/groups/${groupId}/users`, {
    method: 'DELETE',
    body: JSON.stringify({ userIds }),
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  // Xóa nhóm sau khi UI đã xác nhận tên nhóm cần xóa.
  await apiRequest<null>(`/groups/${groupId}`, {
    method: 'DELETE',
  });
}
