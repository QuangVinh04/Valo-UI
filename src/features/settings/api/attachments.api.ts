import { apiRequest, apiRequestWithMeta, type ApiMeta } from '@/lib/api';

export type AttachmentItem = {
  id: string;
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
  const params = new URLSearchParams();
  params.set('limit', String(input.limit ?? 20));
  if (input.cursor) params.set('cursor', input.cursor);

  return apiRequestWithMeta<AttachmentItem[]>(`/attachments?${params.toString()}`);
}

export async function deleteAttachments(ids: string[]): Promise<DeleteAttachmentsResult> {
  return apiRequest<DeleteAttachmentsResult>('/attachments', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
}
