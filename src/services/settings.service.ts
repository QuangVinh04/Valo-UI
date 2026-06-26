import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import { handleServiceError } from './service-error.helper';
import type { ApiResponse } from '@/types/api.type';

export async function clearChatHistory(): Promise<{ deletedCount: number }> {
  try {
    const response = await api.delete<ApiResponse<{ deletedCount: number }>>('/conversations');
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function deleteCurrentAccount(): Promise<null> {
  try {
    const response = await api.delete<ApiResponse<null>>('/users/me');
    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}
