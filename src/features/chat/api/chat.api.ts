import { apiRequest, apiRequestWithMeta } from '@/lib/api';
import type { Conversation, FileUpload, StreamDoneEvent, StreamReadyEvent } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4001/api/v1';

type StreamHandlers = {
  onReady: (event: StreamReadyEvent) => void;
  onToken: (content: string) => void;
  onDone: (event: StreamDoneEvent) => void;
  onError: (message: string) => void;
};

export async function getConversations(): Promise<Conversation[]> {
  const result = await apiRequestWithMeta<Conversation[]>('/conversations?page=1&limit=50');
  return result.data;
}

export async function getConversation(id: string): Promise<Conversation> {
  return apiRequest<Conversation>(`/conversations/${id}`);
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  return apiRequest<Conversation>(`/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await apiRequest<null>(`/conversations/${id}`, {
    method: 'DELETE',
  });
}

export async function sendMessageStream(input: {
  conversationId?: string | null;
  question: string;
  modelName: string;
  title?: string;
  fileUploads?: FileUpload[];
  fileContext?: string;
  signal?: AbortSignal;
}, handlers: StreamHandlers): Promise<void> {
  const token = localStorage.getItem('accessToken');
  const path = input.conversationId
    ? `/messages/conversations/${input.conversationId}`
    : '/messages';
  const body = JSON.stringify({
    question: input.question,
    modelName: input.modelName,
    ...(input.title ? { title: input.title } : {}),
    ...(input.fileUploads?.length ? { fileUploads: input.fileUploads } : {}),
    ...(input.fileContext ? { fileContext: input.fileContext } : {}),
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: input.signal,
    body,
  });

  if (!response.ok || !response.body) {
    handlers.onError(await getStreamErrorMessage(response));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
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
      handleStreamChunk(chunk, handlers);
    }
  }
}

async function getStreamErrorMessage(response: Response): Promise<string> {
  const fallback = `Cannot send message (${response.status} ${response.statusText})`;
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null) as {
      message?: string;
      errors?: Array<{ message?: string }>;
    } | null;

    const details = data?.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join(', ');

    return details || data?.message || fallback;
  }

  const text = await response.text().catch(() => '');
  return text || fallback;
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
    data = JSON.parse(rawData) as unknown;
  } catch {
    handlers.onError('Stream returned an invalid event payload');
    return;
  }

  if (event === 'ready') {
    handlers.onReady(data as StreamReadyEvent);
    return;
  }

  if (event === 'token') {
    handlers.onToken((data as { content: string }).content);
    return;
  }

  if (event === 'done') {
    handlers.onDone(data as StreamDoneEvent);
    return;
  }

  if (event === 'error') {
    handlers.onError((data as { message?: string }).message ?? 'Stream failed');
  }
}
