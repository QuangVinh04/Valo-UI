import { apiRequest, apiRequestWithMeta, type ApiMeta } from '@/lib/api';

export type AttachmentItem = {
  id: string;
  messageId?: string | null;
  name: string;
  mime: string;
  url?: string | null;
  size?: number | null;
  createdAt: string;
};

export type DeleteAttachmentsResult = {
  deletedCount: number;
  notFoundIds: string[];
};

export async function getAttachments(input: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<{ data: AttachmentItem[]; meta: ApiMeta | null }> {
  // Lấy danh sách tệp theo cursor để modal Storage có thể tải thêm.
  const params = new URLSearchParams();
  params.set('limit', String(input.limit ?? 20));
  if (input.cursor) params.set('cursor', input.cursor);

  return apiRequestWithMeta<AttachmentItem[]>(`/attachments?${params.toString()}`);
}

export async function deleteAttachments(ids: string[]): Promise<DeleteAttachmentsResult> {
  // Xóa các tệp đã chọn và trả về những id không còn tồn tại nếu có.
  return apiRequest<DeleteAttachmentsResult>('/attachments', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}
