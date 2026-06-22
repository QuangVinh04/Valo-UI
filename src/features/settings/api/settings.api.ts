import { apiRequest } from '@/lib/api';

export async function clearChatHistory(): Promise<{ deletedCount: number }> {
  return apiRequest<{ deletedCount: number }>('/conversations', {
    method: 'DELETE',
  });
}

export async function deleteCurrentAccount(): Promise<null> {
  return apiRequest<null>('/users/me', {
    method: 'DELETE',
  });
}
