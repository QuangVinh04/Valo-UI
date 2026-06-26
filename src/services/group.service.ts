import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import { handleServiceError } from './service-error.helper';
import type { ApiResponse } from '@/types/api.type';
import type {
  CreatedGroupDto,
  CreateGroupPayload,
  GroupDto,
  GroupListItemDto,
  GroupMemberDto,
  UpdateGroupPayload,
} from '@/types/group.type';

export async function getGroups(page = 1, limit = 100, search?: string): Promise<GroupListItemDto[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (search?.trim()) {
      params.set('search', search.trim());
    }

    const response = await api.get<ApiResponse<GroupListItemDto[]>>(`/groups?${params.toString()}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getGroupById(groupId: string): Promise<GroupDto> {
  try {
    const response = await api.get<ApiResponse<GroupDto>>(`/groups/${groupId}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberDto> {
  try {
    const response = await api.get<ApiResponse<GroupMemberDto>>(`/groups/${groupId}/users`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function createGroup(payload: CreateGroupPayload): Promise<CreatedGroupDto> {
  try {
    const response = await api.post<ApiResponse<CreatedGroupDto>>('/groups', payload);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function updateGroup(groupId: string, payload: UpdateGroupPayload): Promise<GroupDto> {
  try {
    const response = await api.put<ApiResponse<GroupDto>>(`/groups/${groupId}`, payload);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function addGroupMembers(groupId: string, userIds: string[]): Promise<GroupMemberDto> {
  try {
    const response = await api.post<ApiResponse<GroupMemberDto>>(`/groups/${groupId}/users`, { userIds });
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function removeGroupMembers(groupId: string, userIds: string[]): Promise<GroupMemberDto> {
  try {
    const response = await api.delete<ApiResponse<GroupMemberDto>>(`/groups/${groupId}/users`, {
      data: { userIds },
    });
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<null>>(`/groups/${groupId}`);
    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } catch (error) {
    handleServiceError(error);
  }
}
