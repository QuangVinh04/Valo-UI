import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/context/ToastContext';
import { cancelChunkUpload, deleteUploadedFile, uploadChatFile, type UploadTarget } from '@/services/file-upload.service';
import type { FileUpload } from '@/types/chat.type';

export const chatFileLimits = {
  maxFiles: 5,
  maxFileSizeBytes: 20 * 1024 * 1024,
  acceptedFileTypes: [
    '.pdf',
    '.txt',
    '.docx',
    '.xls',
    '.xlsx',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].join(','),
};

const supportedFileExtensions = new Set(['pdf', 'txt', 'docx', 'xls', 'xlsx']);
const supportedFileMimes = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export type SelectedChatFile = {
  id: string;
  file: File;
  status: 'initializing' | 'uploading' | 'finalizing' | 'ready' | 'error';
  uploadTarget?: UploadTarget;
  uploadId?: string;
  progress?: number;
  fileUpload?: FileUpload;
  error?: string;
};

type UseChatUploadsOptions = {
  onError: (message: string) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop();

  return extension?.toLowerCase() ?? '';
}

function isSupportedChatFile(file: File): boolean {
  const mime = file.type.toLowerCase();

  return supportedFileExtensions.has(getFileExtension(file.name))
    || supportedFileMimes.has(mime);
}

function isUploadPending(file: SelectedChatFile): boolean {
  return file.status === 'initializing'
    || file.status === 'uploading'
    || file.status === 'finalizing';
}

export function useChatUploads({ onError }: UseChatUploadsOptions) {
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedFiles, setSelectedFiles] = useState<SelectedChatFile[]>([]);
  const removedUploadIdsRef = useRef(new Set<string>());
  const uploadControllersRef = useRef(new Map<string, AbortController>());
  const uploadSessionIdsRef = useRef(new Map<string, string>());
  const selectedFilesRef = useRef<SelectedChatFile[]>([]);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  const cleanupUploadedFiles = useCallback((fileUploads: FileUpload[]) => {
    fileUploads.forEach((fileUpload) => {
      void deleteUploadedFile(fileUpload).catch(() => undefined);
    });
  }, []);

  const cleanupSelectedUploads = useCallback((files: SelectedChatFile[]) => {
    files.forEach((file) => {
      removedUploadIdsRef.current.add(file.id);
      uploadControllersRef.current.get(file.id)?.abort();
      uploadControllersRef.current.delete(file.id);

      const uploadId = file.uploadId ?? uploadSessionIdsRef.current.get(file.id);
      if (uploadId && !file.fileUpload) {
        void cancelChunkUpload(uploadId)
          .catch(() => undefined)
          .finally(() => {
            uploadSessionIdsRef.current.delete(file.id);
          });
      }

      if (file.fileUpload) {
        void deleteUploadedFile(file.fileUpload)
          .catch(() => undefined)
          .finally(() => {
            uploadSessionIdsRef.current.delete(file.id);
            removedUploadIdsRef.current.delete(file.id);
          });
      }
    });
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const incomingFiles = Array.from(files);
    let availableSlots = Math.max(chatFileLimits.maxFiles - selectedFiles.length, 0);
    let rejectedByCount = 0;
    const warningMessages: string[] = [];
    const nextFiles: File[] = [];

    for (const file of incomingFiles) {
      if (availableSlots <= 0) {
        rejectedByCount += 1;
        continue;
      }

      if (!isSupportedChatFile(file)) {
        warningMessages.push(t('chat.fileLimitUnsupportedType', { name: file.name }));
        continue;
      }

      if (file.size > chatFileLimits.maxFileSizeBytes) {
        warningMessages.push(t('chat.fileLimitSize', {
          name: file.name,
          maxSize: formatFileSize(chatFileLimits.maxFileSizeBytes),
        }));
        continue;
      }

      nextFiles.push(file);
      availableSlots -= 1;
    }

    if (rejectedByCount > 0) {
      warningMessages.unshift(t('chat.fileLimitTooMany', {
        count: rejectedByCount,
        max: chatFileLimits.maxFiles,
      }));
    }

    if (warningMessages.length > 0) {
      const visibleMessages = warningMessages.slice(0, 3);
      const hiddenMessageCount = warningMessages.length - visibleMessages.length;
      const message = hiddenMessageCount > 0
        ? `${visibleMessages.join(' ')} ${t('chat.fileLimitMore', { count: hiddenMessageCount })}`
        : visibleMessages.join(' ');

      toast.warning(message);
    }

    if (nextFiles.length === 0) return;

    const nextSelectedFiles = nextFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      status: 'initializing' as const,
      progress: 0,
    }));

    setSelectedFiles((current) => [...current, ...nextSelectedFiles]);

    const uploadSelectedFile = async (selectedFile: SelectedChatFile) => {
      if (removedUploadIdsRef.current.has(selectedFile.id)) {
        removedUploadIdsRef.current.delete(selectedFile.id);
        return;
      }

      const controller = new AbortController();
      uploadControllersRef.current.set(selectedFile.id, controller);

      try {
        const uploaded = await uploadChatFile(selectedFile.file, {
          signal: controller.signal,
          onUploadTargetChange: (uploadTarget) => {
            setSelectedFiles((current) => current.map((item) => (
              item.id === selectedFile.id
                ? { ...item, uploadTarget }
                : item
            )));
          },
          onUploadId: (uploadId) => {
            uploadSessionIdsRef.current.set(selectedFile.id, uploadId);
            setSelectedFiles((current) => current.map((item) => (
              item.id === selectedFile.id
                ? { ...item, uploadId }
                : item
            )));
          },
          onProgress: (progress) => {
            setSelectedFiles((current) => current.map((item) => (
              item.id === selectedFile.id
                ? { ...item, progress }
                : item
            )));
          },
          onPhaseChange: (phase) => {
            setSelectedFiles((current) => current.map((item) => (
              item.id === selectedFile.id
                ? { ...item, status: phase }
                : item
            )));
          },
        });

        uploadControllersRef.current.delete(selectedFile.id);
        uploadSessionIdsRef.current.delete(selectedFile.id);

        if (removedUploadIdsRef.current.has(selectedFile.id)) {
          removedUploadIdsRef.current.delete(selectedFile.id);
          void deleteUploadedFile(uploaded.fileUpload).catch((err) => {
            onError(err instanceof Error ? err.message : 'Cannot delete uploaded file');
          });
          return;
        }

        setSelectedFiles((current) => current.map((item) => (
          item.id === selectedFile.id
            ? {
              ...item,
              status: 'ready',
              uploadTarget: item.uploadTarget,
              progress: 100,
              fileUpload: uploaded.fileUpload,
              error: undefined,
            }
            : item
        )));
      } catch (err) {
        uploadControllersRef.current.delete(selectedFile.id);
        uploadSessionIdsRef.current.delete(selectedFile.id);

        if (removedUploadIdsRef.current.has(selectedFile.id)) {
          removedUploadIdsRef.current.delete(selectedFile.id);
          return;
        }

        setSelectedFiles((current) => current.map((item) => (
          item.id === selectedFile.id
            ? {
              ...item,
              status: 'error',
              error: err instanceof Error ? err.message : 'Cannot upload file',
            }
            : item
        )));
      }
    };

    let nextUploadIndex = 0;
    const uploadWorker = async () => {
      while (nextUploadIndex < nextSelectedFiles.length) {
        const selectedFile = nextSelectedFiles[nextUploadIndex];
        nextUploadIndex += 1;

        await uploadSelectedFile(selectedFile);
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(2, nextSelectedFiles.length) }, uploadWorker)
    );
  }, [onError, selectedFiles.length, t, toast]);

  const removeFile = useCallback((index: number) => {
    const selectedFile = selectedFiles[index];
    if (!selectedFile) return;

    removedUploadIdsRef.current.add(selectedFile.id);
    uploadControllersRef.current.get(selectedFile.id)?.abort();
    uploadControllersRef.current.delete(selectedFile.id);

    const uploadId = selectedFile.uploadId ?? uploadSessionIdsRef.current.get(selectedFile.id);
    if (uploadId && !selectedFile.fileUpload) {
      void cancelChunkUpload(uploadId)
        .catch((err) => {
          onError(err instanceof Error ? err.message : 'Cannot cancel upload');
        })
        .finally(() => {
          uploadSessionIdsRef.current.delete(selectedFile.id);
        });
    }

    if (selectedFile.fileUpload) {
      void deleteUploadedFile(selectedFile.fileUpload)
        .catch((err) => {
          onError(err instanceof Error ? err.message : 'Cannot delete uploaded file');
        })
        .finally(() => {
          uploadSessionIdsRef.current.delete(selectedFile.id);
          removedUploadIdsRef.current.delete(selectedFile.id);
        });
    }

    setSelectedFiles((current) => current.filter((item) => item.id !== selectedFile.id));
  }, [onError, selectedFiles]);

  return {
    selectedFiles,
    selectedFilesRef,
    addFiles,
    removeFile,
    clearSelectedFiles,
    cleanupSelectedUploads,
    cleanupUploadedFiles,
    fileLimits: chatFileLimits,
    isWaitingForUploads: selectedFiles.some(isUploadPending),
    hasFailedUploads: selectedFiles.some((file) => file.status === 'error'),
  };
}
