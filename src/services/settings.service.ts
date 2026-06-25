import { apiRequest } from '@/lib/api';

export async function clearChatHistory(): Promise<{ deletedCount: number }> {
  // Xóa toàn bộ lịch sử chat của tài khoản hiện tại.
  return apiRequest<{ deletedCount: number }>('/conversations', {
    method: 'DELETE',
  });
}

export async function deleteCurrentAccount(): Promise<null> {
  // Xóa tài khoản hiện tại sau khi người dùng xác nhận trong Settings.
  return apiRequest<null>('/users/me', {
    method: 'DELETE',
  });
}
