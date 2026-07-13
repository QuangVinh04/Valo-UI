import { API_BASE_URL, api, authFetch } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import { handleServiceError } from './service-error.helper';
import type { ApiMeta, ApiResponse } from '@/types/api.type';
import type { Conversation, FileUpload, StreamDoneEvent, StreamHandlers, StreamReadyEvent } from '@/types/chat.type';

export async function getConversations(input: {
  cursor?: string | null;
  limit?: number;
  search?: string;
} = {}): Promise<{ data: Conversation[]; meta?: ApiMeta }> {
  try {
    const params = new URLSearchParams({ limit: String(input.limit ?? 20) });
    if (input.cursor) params.set('cursor', input.cursor);
    if (input.search?.trim()) params.set('search', input.search.trim());
    const response = await api.get<ApiResponse<Conversation[]>>(`/conversations?${params.toString()}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return { data: response.data.data, meta: response.data.meta ?? undefined };
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getConversation(id: string): Promise<Conversation> {
  try {
    const response = await api.get<ApiResponse<Conversation>>(`/conversations/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  try {
    const response = await api.put<ApiResponse<Conversation>>(`/conversations/${id}`, { title });
    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<null>>(`/conversations/${id}`);
    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } catch (error) {
    handleServiceError(error);
  }
}
export async function exportMessageDocx(messageId: string): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/messages/${messageId}/export/docx`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Cannot export message');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const fileName = getDownloadFileName(response.headers.get('content-disposition'))
    ?? `message-${messageId}.docx`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

function getDownloadFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export async function sendMessageStream(
  input: {
    conversationId?: string | null;
    question: string;
    modelName: string;
    title?: string;
    fileUploads?: FileUpload[];
    signal?: AbortSignal;
  },
  handlers: StreamHandlers
): Promise<void> {
  const path = input.conversationId
    ? `/messages/conversations/${input.conversationId}`
    : '/messages';

  const body = {
    question: input.question,
    modelName: input.modelName,
    ...(input.title ? { title: input.title } : {}),
    ...(input.fileUploads?.length ? { fileUploads: input.fileUploads } : {}),
  };

  const response = await authFetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: input.signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await getStreamErrorMessage(response);
    throw new AppError(errorText, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      if (buffer.trim()) {
        handleStreamChunk(buffer, handlers);
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      if (chunk.trim()) {
        handleStreamChunk(chunk, handlers);
      }
    }
  }
}

async function getStreamErrorMessage(response: Response): Promise<string> {
  const fallback = `Cannot send message (${response.status} ${response.statusText})`;
  const contentType = response.headers.get('content-type') ?? '';

  try {
    const rawText = await response.text();

    if (!contentType.includes('application/json')) {
      return rawText || fallback;
    }

    const data = JSON.parse(rawText || 'null') as {
      message?: string;
      errors?: Array<{ message?: string }>;
    } | null;

    const details = data?.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(', ');

    return details || data?.message || fallback;
  } catch {
    return fallback;
  }
}

function handleStreamChunk(chunk: string, handlers: StreamHandlers) {
  const lines = chunk.split('\n');
  const eventLine = lines.find((line) => line.startsWith('event:'));
  const dataLines = lines.filter((line) => line.startsWith('data:'));

  if (!eventLine || !dataLines.length) return;

  const event = eventLine.replace('event:', '').trim();
  const rawData = dataLines.map((line) => line.replace('data:', '').trim()).join('\n');
  let data: unknown;

  try {
    data = JSON.parse(rawData);
  } catch {
    handlers.onError('Stream returned an invalid event payload');
    return;
  }

  switch (event) {
    case 'ready':
      handlers.onReady(data as StreamReadyEvent);
      break;
    case 'token':
      handlers.onToken((data as { content: string }).content);
      break;
    case 'done':
      handlers.onDone(data as StreamDoneEvent);
      break;
    case 'error':
      handlers.onError((data as { message?: string }).message ?? 'Stream failed');
      break;
    default:
      break;
  }
}
