import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import { handleServiceError } from './service-error.helper';
import type { ApiMeta, ApiResponse } from '@/types/api.type';
import type { AttachmentItem, DeleteAttachmentsResult } from '@/types/attachment.type';

export async function getAttachments(input: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<{ data: AttachmentItem[]; meta: ApiMeta | null }> {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(input.limit ?? 20));
    if (input.cursor) params.set('cursor', input.cursor);

    const response = await api.get<ApiResponse<AttachmentItem[]>>(`/attachments?${params.toString()}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return {
      data: response.data.data,
      meta: response.data.meta ?? null,
    };
  } catch (error) {
    handleServiceError(error);
  }
}

export async function deleteAttachments(ids: string[]): Promise<DeleteAttachmentsResult> {
  try {
    const response = await api.delete<ApiResponse<DeleteAttachmentsResult>>('/attachments', {
      data: { ids },
    });

    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}
