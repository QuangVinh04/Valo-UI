import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { deleteUploadedFile, uploadChatFile, type UploadTarget } from '@/services/file-upload.service';
import { deleteConversation, getConversation, getConversations, renameConversation, sendMessageStream } from '@/services/chat.service';
import type { ChatMessage, Conversation, FileUpload, StreamDoneEvent, StreamReadyEvent } from '@/types/chat.type';

export const chatModelOptions = [
  { value: 'groq-llama-3.3', label: 'Llama 3.3' },
  { value: 'flowise-agent', label: 'Flowise agent' },
] as const;

const availableModels = chatModelOptions.map((model) => model.value);
export type ChatModelKey = typeof chatModelOptions[number]['value'];
const defaultModel = availableModels[0];
const chatFileLimits = {
  maxFiles: 5,
  maxFileSizeBytes: 10 * 1024 * 1024,
  acceptedFileTypes: [
    '.pdf',
    '.txt',
    '.xls',
    '.xlsx',
    'application/pdf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ].join(','),
};

const supportedFileExtensions = new Set(['pdf', 'txt', 'xls', 'xlsx']);
const supportedFileMimes = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function normalizeModelName(modelName: string | null | undefined): ChatModelKey {
  return availableModels.includes(modelName as typeof availableModels[number])
    ? modelName as ChatModelKey
    : defaultModel;
}

function getConversationMessages(conversation: Conversation): ChatMessage[] {
  return Array.isArray(conversation.messages) ? conversation.messages : [];
}

function mergeConversation(current: Conversation, next: Conversation): Conversation {
  return {
    ...current,
    ...next,
    messages: next.messages ?? current.messages,
  };
}

function upsertConversationAtTop(current: Conversation[], conversation: Conversation): Conversation[] {
  const existing = current.find((item) => item.id === conversation.id);
  const nextConversation = existing ? mergeConversation(existing, conversation) : conversation;

  return [
    nextConversation,
    ...current.filter((item) => item.id !== conversation.id),
  ];
}

function createPendingAssistantMessage(modelName: string): ChatMessage {
  return {
    id: `assistant-${Date.now()}`,
    content: '',
    senderType: 'assistant',
    modelName,
    createdAt: new Date().toISOString(),
  };
}

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

type ChatContextValue = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatContextValue | null>(null);

export type SelectedChatFile = {
  id: string;
  file: File;
  status: 'uploading' | 'ready' | 'error';
  uploadTarget?: UploadTarget;
  fileUpload?: FileUpload;
  error?: string;
};

function useChatState() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const chatRouteMatch = useMatch('/chat/:conversationId');
  const routeConversationId = chatRouteMatch?.params.conversationId ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedChatFile[]>([]);
  const [modelName, setModelName] = useState(defaultModel);
  const [isLoading, setIsLoading] = useState(true);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const historyResetVersionRef = useRef(0);
  const removedUploadIdsRef = useRef(new Set<string>());
  const selectedFilesRef = useRef<SelectedChatFile[]>([]);

  const cleanupUploadedFiles = useCallback((fileUploads: FileUpload[]) => {
    fileUploads.forEach((fileUpload) => {
      void deleteUploadedFile(fileUpload).catch(() => undefined);
    });
  }, []);

  const cleanupSelectedUploads = useCallback((files: SelectedChatFile[]) => {
    files.forEach((file) => {
      removedUploadIdsRef.current.add(file.id);

      if (file.fileUpload) {
        void deleteUploadedFile(file.fileUpload)
          .catch(() => undefined)
          .finally(() => {
            removedUploadIdsRef.current.delete(file.id);
          });
      }
    });
  }, []);

  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    if (location.pathname.startsWith('/chat') || selectedFilesRef.current.length === 0) {
      return;
    }

    cleanupSelectedUploads(selectedFilesRef.current);
    setSelectedFiles([]);
  }, [cleanupSelectedUploads, location.pathname]);

  useEffect(() => {
    let ignore = false;

    // Tải danh sách hội thoại ban đầu và bỏ qua kết quả nếu lịch sử vừa bị xóa.
    async function loadConversations() {
      const resetVersion = historyResetVersionRef.current;

      setIsLoading(true);
      setError('');

      try {
        const data = await getConversations();
        if (ignore || historyResetVersionRef.current !== resetVersion) return;

        setConversations(data);
      } catch (err) {
        if (!ignore && historyResetVersionRef.current === resetVersion) {
          setError(err instanceof Error ? err.message : 'Cannot load conversations');
        }
      } finally {
        if (!ignore && historyResetVersionRef.current === resetVersion) {
          setIsLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      ignore = true;
    };
  }, []);

  const activeConversationId = activeConversation?.id ?? null;
  const isOpeningConversation = openingConversationId !== null;

  // Mở một hội thoại, ưu tiên dữ liệu cache để UI phản hồi nhanh rồi làm mới từ API.
  const selectConversation = useCallback(async (conversationId: string) => {
    const resetVersion = historyResetVersionRef.current;

    setError('');
    cleanupSelectedUploads(selectedFilesRef.current);
    setSelectedFiles([]);
    setOpeningConversationId(conversationId);
    const existing = conversations.find((conversation) => conversation.id === conversationId);
    if (existing) {
      setActiveConversation(existing);
      setMessages(getConversationMessages(existing));
      setModelName(normalizeModelName(existing.modelName));
    }

    try {
      const conversation = await getConversation(conversationId);
      if (historyResetVersionRef.current !== resetVersion) return;

      setActiveConversation(conversation);
      setMessages(getConversationMessages(conversation));
      setModelName(normalizeModelName(conversation.modelName));
      setConversations((current) => current.map((item) => item.id === conversation.id ? conversation : item));
    } catch (err) {
      if (historyResetVersionRef.current === resetVersion) {
        setError(err instanceof Error ? err.message : 'Cannot load conversation');
      }
    } finally {
      if (historyResetVersionRef.current === resetVersion) {
        setOpeningConversationId((current) => current === conversationId ? null : current);
      }
    }
  }, [cleanupSelectedUploads, conversations]);

  useEffect(() => {
    if (!routeConversationId || routeConversationId === activeConversationId || openingConversationId === routeConversationId) {
      return;
    }

    void selectConversation(routeConversationId);
  }, [activeConversationId, openingConversationId, routeConversationId, selectConversation]);

  // Reset vùng chat để bắt đầu hội thoại mới.
  const startNewChat = useCallback(() => {
    streamAbortControllerRef.current?.abort();
    cleanupSelectedUploads(selectedFilesRef.current);
    setActiveConversation(null);
    setMessages([]);
    setPrompt('');
    setSelectedFiles([]);
    setError('');
    setOpeningConversationId(null);
    navigate('/chat');
  }, [cleanupSelectedUploads, navigate]);

  // Xóa toàn bộ trạng thái chat trong bộ nhớ sau khi backend đã xóa lịch sử.
  const clearChatHistoryState = useCallback(() => {
    historyResetVersionRef.current += 1;
    streamAbortControllerRef.current?.abort();
    streamAbortControllerRef.current = null;
    cleanupSelectedUploads(selectedFilesRef.current);

    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    setPrompt('');
    setSelectedFiles([]);
    setIsLoading(false);
    setIsStreaming(false);
    setError('');
    setOpeningConversationId(null);

    if (routeConversationId) {
      navigate('/chat', { replace: true });
    }
  }, [cleanupSelectedUploads, navigate, routeConversationId]);

  // Dừng stream đang chạy nhưng giữ lại nội dung đã nhận được.
  const stopGenerating = () => {
    streamAbortControllerRef.current?.abort();
  };

  // Thêm tệp vào hàng đợi upload và cập nhật trạng thái từng tệp độc lập.
  const addFiles = async (files: FileList | File[]) => {
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
      status: 'uploading' as const,
    }));

    setSelectedFiles((current) => [...current, ...nextSelectedFiles]);

    nextSelectedFiles.forEach((selectedFile) => {
      void uploadChatFile(selectedFile.file, {
        onUploadTargetChange: (uploadTarget) => {
          setSelectedFiles((current) => current.map((item) => (
            item.id === selectedFile.id
              ? {
                ...item,
                uploadTarget,
              }
              : item
          )));
        },
      })
        .then((uploaded) => {
          if (removedUploadIdsRef.current.has(selectedFile.id)) {
            removedUploadIdsRef.current.delete(selectedFile.id);
            void deleteUploadedFile(uploaded.fileUpload).catch((err) => {
              setError(err instanceof Error ? err.message : 'Cannot delete uploaded file');
            });
            return;
          }

          setSelectedFiles((current) => current.map((item) => (
            item.id === selectedFile.id
              ? {
                ...item,
                status: 'ready',
                uploadTarget: item.uploadTarget,
                fileUpload: uploaded.fileUpload,
                error: undefined,
              }
              : item
          )));
        })
        .catch((err) => {
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
        });
    });
  };

  // Xóa tệp đã chọn khỏi composer theo vị trí hiển thị.
  const removeFile = (index: number) => {
    const selectedFile = selectedFiles[index];
    if (!selectedFile) return;

    removedUploadIdsRef.current.add(selectedFile.id);

    if (selectedFile.fileUpload) {
      void deleteUploadedFile(selectedFile.fileUpload)
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Cannot delete uploaded file');
        })
        .finally(() => {
          removedUploadIdsRef.current.delete(selectedFile.id);
        });
    }

    setSelectedFiles((current) => current.filter((item) => item.id !== selectedFile.id));
  };

  // Đổi tên hội thoại và đồng bộ lại cả sidebar lẫn hội thoại đang mở.
  const renameChat = async (conversationId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    setError('');

    try {
      const updatedConversation = await renameConversation(conversationId, nextTitle);
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationId
          ? { ...conversation, ...updatedConversation, messages: conversation.messages ?? updatedConversation.messages }
          : conversation
      )));
      setActiveConversation((current) => (
        current?.id === conversationId
          ? { ...current, ...updatedConversation, messages: getConversationMessages(updatedConversation) }
          : current
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot rename conversation');
    }
  };

  // Xóa một hội thoại; nếu đang mở hội thoại đó thì quay về chat mới.
  const deleteChat = async (conversationId: string) => {
    setError('');

    try {
      await deleteConversation(conversationId);
      setConversations((current) => current.filter((conversation) => conversation.id !== conversationId));

      if (activeConversationId === conversationId) {
        startNewChat();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot delete conversation');
    }
  };

  // Gửi prompt/file lên AI, xử lý upload chờ, stream phản hồi và cập nhật sidebar.
  const sendPrompt = async () => {
    const content = prompt.trim();
    const filesToSend = selectedFiles;
    const isWaitingForUploads = filesToSend.some((file) => file.status === 'uploading');
    const hasFailedUploads = filesToSend.some((file) => file.status === 'error');
    const readyFiles = filesToSend.filter((file) => file.status === 'ready' && file.fileUpload);

    if ((!content && !filesToSend.length) || isStreaming) return;
    if (isWaitingForUploads) {
      setError('Please wait for the file to finish uploading.');
      return;
    }
    if (hasFailedUploads) {
      setError('Please remove failed uploads before sending.');
      return;
    }

    const question = content || 'Please analyze the attached file.';

    setPrompt('');
    setError('');
    setIsStreaming(true);
    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;
    const resetVersion = historyResetVersionRef.current;

    let assistantMessage = createPendingAssistantMessage(modelName);

    const updatePendingAssistantMessage = (
      content: string,
      streamStatus?: ChatMessage['streamStatus']
    ) => {
      assistantMessage = {
        ...assistantMessage,
        content,
        streamStatus,
      };

      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? assistantMessage : message
      )));
    };

    const appendAssistantStatus = (
      statusMessage: string,
      streamStatus?: ChatMessage['streamStatus']
    ) => {
      const nextContent = assistantMessage.content.trim()
        ? `${assistantMessage.content.trimEnd()}\n\n${statusMessage}`
        : statusMessage;

      updatePendingAssistantMessage(nextContent, streamStatus);
    };

    // Khi backend tạo hội thoại/tin nhắn xong, hiển thị ngay tin nhắn đầu tiên.
    const handleReady = (event: StreamReadyEvent) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      const now = new Date().toISOString();

      setSelectedFiles([]);
      setMessages((current) => [...current, event.userMessage, assistantMessage]);
      setActiveConversation((current) => current ?? {
        id: event.conversationId,
        title: question.slice(0, 50),
        modelName,
        userId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [event.userMessage],
      });
      setConversations((current) => {
        const existing = current.find((conversation) => conversation.id === event.conversationId);
        const conversation = existing
          ? {
            ...existing,
            updatedAt: now,
          }
          : {
            id: event.conversationId,
            title: question.slice(0, 50),
            modelName,
            userId: '',
            createdAt: now,
            updatedAt: now,
            messages: [event.userMessage],
          };

        return upsertConversationAtTop(current, conversation);
      });
      navigate(`/chat/${event.conversationId}`, { replace: !activeConversationId });
    };

    // Ghép token stream vào tin nhắn assistant tạm thời.
    const handleToken = (token: string) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      assistantMessage = {
        ...assistantMessage,
        content: assistantMessage.content + token,
      };
      updatePendingAssistantMessage(assistantMessage.content);
    };

    // Khi stream kết thúc, thay tin nhắn tạm bằng dữ liệu chuẩn từ backend.
    const handleDone = async (event: StreamDoneEvent) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? event.assistantMessage : message
      )));

      try {
        const conversation = await getConversation(event.conversationId);
        if (historyResetVersionRef.current !== resetVersion) return;

        setActiveConversation(conversation);
        setMessages(getConversationMessages(conversation));
        setConversations((current) => upsertConversationAtTop(current, conversation));
      } catch {
        // The streamed messages are already visible; conversation refresh can be retried later.
      }
    };

    let didCompleteStream = false;
    let didStreamFail = false;
    const fileUploads = readyFiles.flatMap((file) => file.fileUpload ? [file.fileUpload] : []);

    try {
      await sendMessageStream({
        conversationId: activeConversationId,
        question,
        modelName,
        title: activeConversationId ? undefined : question.slice(0, 50),
        fileUploads,
        signal: abortController.signal,
      }, {
        onReady: handleReady,
        onToken: handleToken,
        onDone: (event) => {
          didCompleteStream = true;
          void handleDone(event);
        },
        onError: (message) => {
          didStreamFail = true;
          setError(message);
          appendAssistantStatus(t('chat.generationError', { message }), 'error');
        },
      });

      if (didStreamFail && !didCompleteStream) {
        cleanupUploadedFiles(fileUploads);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        appendAssistantStatus(t('chat.generationStopped'));
      } else {
        const message = err instanceof Error ? err.message : 'Cannot send message';
        setError(message);
        appendAssistantStatus(t('chat.generationError', { message }), 'error');
      }

      if (!didCompleteStream) {
        cleanupUploadedFiles(fileUploads);
      }
    } finally {
      if (streamAbortControllerRef.current === abortController) {
        streamAbortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  return useMemo(() => ({
    conversations,
    activeConversationId,
    messages,
    prompt,
    selectedFiles,
    modelName,
    isLoading,
    isOpeningConversation,
    openingConversationId,
    isStreaming,
    isWaitingForUploads: selectedFiles.some((file) => file.status === 'uploading'),
    hasFailedUploads: selectedFiles.some((file) => file.status === 'error'),
    fileLimits: chatFileLimits,
    error,
    setPrompt,
    setModelName,
    addFiles,
    removeFile,
    selectConversation,
    startNewChat,
    clearChatHistoryState,
    renameChat,
    deleteChat,
    stopGenerating,
    sendPrompt,
  }), [conversations, activeConversationId, messages, prompt, selectedFiles, modelName, isLoading, isOpeningConversation, openingConversationId, isStreaming, error, t, toast, selectConversation, startNewChat, clearChatHistoryState]);
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const value = useChatState();

  return createElement(ChatContext.Provider, { value }, children);
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChat must be used inside ChatProvider');
  }

  return context;
}
