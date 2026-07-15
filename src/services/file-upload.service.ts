import { AxiosError } from 'axios';
import { api } from '@/lib/api-client';
import { AppError } from '@/errors/app-error';
import type { ApiResponse } from '@/types/api.type';
import type { FileUpload } from '@/types/chat.type';
import { handleServiceError } from './service-error.helper';

const UPLOAD_BASE_ENDPOINT =
  (import.meta.env.VITE_UPLOAD_BASE_ENDPOINT as string | undefined) ?? '/attachments/uploads';
const UPLOAD_CHUNK_SIZE_BYTES = Number(
  import.meta.env.VITE_UPLOAD_CHUNK_SIZE_BYTES ?? 2 * 1024 * 1024
);
const CHUNK_UPLOAD_RETRY_DELAYS_MS = [500, 1000];

export type UploadTarget = 'server';
export type ChunkUploadStatus =
  | 'INITIALIZED'
  | 'UPLOADING'
  | 'ASSEMBLING'
  | 'STORING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

type UploadChatFileOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
  onUploadId?: (uploadId: string) => void;
  onUploadTargetChange?: (target: UploadTarget) => void;
  onPhaseChange?: (phase: 'initializing' | 'uploading' | 'finalizing') => void;
};

type InitializeChunkUploadInput = {
  fileName: string;
  mimeType: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  signal?: AbortSignal;
};

export type ChunkUploadSession = {
  uploadId: string;
  chunkSize: number;
  uploadedChunks: number[];
  expiresAt?: string;
};

export type ChunkUploadStatusResponse = {
  uploadId: string;
  status: ChunkUploadStatus;
  totalChunks: number;
  uploadedChunks: number[];
  missingChunks: number[];
};

type CompleteUploadResult = FileUpload | {
  fileUpload?: FileUpload;
  file?: FileUpload;
  uploadedFile?: FileUpload;
  attachment?: FileUpload;
};

export async function uploadChatFile(file: File, options?: UploadChatFileOptions): Promise<{
  fileUpload: FileUpload;
}> {
  options?.onUploadTargetChange?.('server');

  return {
    fileUpload: await uploadFileChunked(file, options),
  };
}

export async function deleteUploadedFile(fileUpload: FileUpload): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>('/attachments/upload', {
      data: { url: fileUpload.data },
    });

    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } catch (error) {
    handleServiceError(error);
  }
}

export async function initializeChunkUpload(input: InitializeChunkUploadInput): Promise<ChunkUploadSession> {
  try {
    const response = await api.post<ApiResponse<ChunkUploadSession>>(
      `${UPLOAD_BASE_ENDPOINT}/init`,
      {
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        chunkSize: input.chunkSize,
        totalChunks: input.totalChunks,
      },
      {
        signal: input.signal,
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return {
      ...response.data.data,
      uploadedChunks: response.data.data.uploadedChunks ?? [],
    };
  } catch (error) {
    handleServiceError(error);
  }
}

export async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
  input: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    totalChunks: number;
    chunkStart: number;
    chunkEnd: number;
    isLastChunk: boolean;
  },
  signal?: AbortSignal
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('file', chunk, input.fileName);
    formData.append('uploadId', uploadId);
    formData.append('fileName', input.fileName);
    formData.append('name', input.fileName);
    formData.append('mimeType', input.mimeType);
    formData.append('mime', input.mimeType);
    formData.append('fileSize', String(input.fileSize));
    formData.append('size', String(input.fileSize));
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('chunkNumber', String(chunkIndex + 1));
    formData.append('totalChunks', String(input.totalChunks));
    formData.append('chunkStart', String(input.chunkStart));
    formData.append('chunkEnd', String(input.chunkEnd));
    formData.append('isLastChunk', String(input.isLastChunk));

    const response = await api.put<ApiResponse<unknown>>(
      `${UPLOAD_BASE_ENDPOINT}/${uploadId}/chunks/${chunkIndex}`,
      formData,
      {
        signal,
      }
    );

    if (!response.data.success) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }
  } catch (error) {
    handleServiceError(error);
  }
}

export async function getChunkUploadStatus(
  uploadId: string,
  signal?: AbortSignal
): Promise<ChunkUploadStatusResponse> {
  try {
    const response = await api.get<ApiResponse<ChunkUploadStatusResponse>>(
      `${UPLOAD_BASE_ENDPOINT}/${uploadId}`,
      { signal }
    );

    if (!response.data.success || !response.data.data) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return response.data.data;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function completeChunkUpload(
  uploadId: string,
  signal?: AbortSignal
): Promise<FileUpload> {
  try {
    const response = await api.post<ApiResponse<CompleteUploadResult>>(
      `${UPLOAD_BASE_ENDPOINT}/${uploadId}/complete`,
      undefined,
      { signal }
    );

    const fileUpload = response.data.data
      ? getFileUploadFromCompleteResponse(response.data.data)
      : null;

    if (!response.data.success || !fileUpload) {
      throw new AppError(response.data.message, response.status, response.data.errors);
    }

    return fileUpload;
  } catch (error) {
    handleServiceError(error);
  }
}

export async function cancelChunkUpload(uploadId: string): Promise<void> {
  try {
    await api.delete<ApiResponse<unknown>>(`${UPLOAD_BASE_ENDPOINT}/${uploadId}`);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return;
    }

    handleServiceError(error);
  }
}

export async function uploadFileChunked(
  file: File,
  options: UploadChatFileOptions = {}
): Promise<FileUpload> {
  const mimeType = file.type || inferMimeFromName(file.name);
  const chunkSize = getUploadChunkSize();
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  options.onPhaseChange?.('initializing');
  options.onProgress?.(0);

  const session = await initializeChunkUpload({
    fileName: file.name,
    mimeType,
    fileSize: file.size,
    chunkSize,
    totalChunks,
    signal: options.signal,
  });

  options.onUploadId?.(session.uploadId);
  options.onPhaseChange?.('uploading');

  const uploadedSet = new Set(session.uploadedChunks);

  for (let index = 0; index < totalChunks; index += 1) {
    if (uploadedSet.has(index)) {
      options.onProgress?.(getChunkProgress(index + 1, totalChunks));
      continue;
    }

    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end, mimeType);

    await uploadChunkWithRetry(session.uploadId, index, chunk, {
      fileName: file.name,
      mimeType,
      fileSize: file.size,
      totalChunks,
      chunkStart: start,
      chunkEnd: end,
      isLastChunk: index === totalChunks - 1,
    }, options.signal);
    options.onProgress?.(getChunkProgress(index + 1, totalChunks));
  }

  options.onPhaseChange?.('finalizing');
  options.onProgress?.(95);

  const fileUpload = await completeChunkUpload(session.uploadId, options.signal);

  options.onProgress?.(100);

  return {
    ...fileUpload,
    mime: fileUpload.mime || mimeType,
    size: fileUpload.size ?? file.size,
  };
}

export async function uploadMultipleFilesChunked(
  files: File[],
  options: {
    concurrency?: number;
    signal?: AbortSignal;
    onFileProgress?: (file: File, progress: number) => void;
  } = {}
): Promise<FileUpload[]> {
  const concurrency = Math.max(1, options.concurrency ?? 2);
  const results: FileUpload[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const currentIndex = nextIndex;
      const file = files[currentIndex];
      nextIndex += 1;

      results[currentIndex] = await uploadFileChunked(file, {
        signal: options.signal,
        onProgress: (progress) => options.onFileProgress?.(file, progress),
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, files.length) }, () => worker())
  );

  return results;
}

async function uploadChunkWithRetry(
  uploadId: string,
  chunkIndex: number,
  chunk: Blob,
  input: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    totalChunks: number;
    chunkStart: number;
    chunkEnd: number;
    isLastChunk: boolean;
  },
  signal?: AbortSignal
): Promise<void> {
  for (let attempt = 0; attempt <= CHUNK_UPLOAD_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await uploadChunk(uploadId, chunkIndex, chunk, input, signal);
      return;
    } catch (error) {
      if (
        attempt >= CHUNK_UPLOAD_RETRY_DELAYS_MS.length
        || !shouldRetryChunkUpload(error)
        || signal?.aborted
      ) {
        throw error;
      }

      await delay(CHUNK_UPLOAD_RETRY_DELAYS_MS[attempt], signal);
    }
  }
}

function shouldRetryChunkUpload(error: unknown): boolean {
  if (error instanceof AppError) {
    return !error.status
      || [408, 429].includes(error.status)
      || error.status >= 500;
  }

  if (!(error instanceof AxiosError)) {
    return false;
  }

  if (!error.response) {
    return error.code !== 'ERR_CANCELED';
  }

  return [408, 429].includes(error.response.status)
    || error.response.status >= 500;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Upload cancelled', 'AbortError'));
    }, { once: true });
  });
}

function getUploadChunkSize(): number {
  if (
    Number.isFinite(UPLOAD_CHUNK_SIZE_BYTES)
    && UPLOAD_CHUNK_SIZE_BYTES > 0
  ) {
    return UPLOAD_CHUNK_SIZE_BYTES;
  }

  return 2 * 1024 * 1024;
}

function getChunkProgress(completedChunks: number, totalChunks: number): number {
  return Math.min(90, Math.round((completedChunks / totalChunks) * 90));
}

function getFileUploadFromCompleteResponse(data: CompleteUploadResult): FileUpload | null {
  if (isFileUpload(data)) return data;

  const candidates = [
    data.fileUpload,
    data.file,
    data.uploadedFile,
    data.attachment,
  ];

  return candidates.find(isFileUpload) ?? null;
}

function isFileUpload(value: unknown): value is FileUpload {
  return Boolean(
    value
    && typeof value === 'object'
    && 'data' in value
    && typeof (value as FileUpload).data === 'string'
    && 'name' in value
    && typeof (value as FileUpload).name === 'string'
    && 'type' in value
    && (value as FileUpload).type === 'url'
  );
}

function inferMimeFromName(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.md')) return 'text/markdown';
  if (lowerName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lowerName.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lowerName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}
