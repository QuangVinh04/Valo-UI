import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { uploadChatFile } from '@/services/file-upload.service';
import { deleteConversation, getConversation, getConversations, renameConversation, sendMessageStream } from '@/services/chat.service';
import type { ChatMessage, Conversation, FileUpload, StreamDoneEvent, StreamReadyEvent } from '@/types/chat.types';

export const chatModelOptions = [
  { value: 'groq-llama-3.3', label: 'Llama 3.3' },
  { value: 'flowise-agent', label: 'Flowise agent' },
] as const;

const availableModels = chatModelOptions.map((model) => model.value);
export type ChatModelKey = typeof chatModelOptions[number]['value'];
const defaultModel = availableModels[0];

function normalizeModelName(modelName: string | null | undefined): ChatModelKey {
  return availableModels.includes(modelName as typeof availableModels[number])
    ? modelName as ChatModelKey
    : defaultModel;
}

function getConversationMessages(conversation: Conversation): ChatMessage[] {
  return Array.isArray(conversation.messages) ? conversation.messages : [];
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

type ChatContextValue = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatContextValue | null>(null);

export type SelectedChatFile = {
  id: string;
  file: File;
  status: 'uploading' | 'ready' | 'error';
  fileUpload?: FileUpload;
  error?: string;
};

function useChatState() {
  const navigate = useNavigate();
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
  }, [conversations]);

  useEffect(() => {
    if (!routeConversationId || routeConversationId === activeConversationId || openingConversationId === routeConversationId) {
      return;
    }

    void selectConversation(routeConversationId);
  }, [activeConversationId, openingConversationId, routeConversationId, selectConversation]);

  // Reset vùng chat để bắt đầu hội thoại mới.
  const startNewChat = useCallback(() => {
    streamAbortControllerRef.current?.abort();
    setActiveConversation(null);
    setMessages([]);
    setPrompt('');
    setSelectedFiles([]);
    setError('');
    setOpeningConversationId(null);
    navigate('/chat');
  }, [navigate]);

  // Xóa toàn bộ trạng thái chat trong bộ nhớ sau khi backend đã xóa lịch sử.
  const clearChatHistoryState = useCallback(() => {
    historyResetVersionRef.current += 1;
    streamAbortControllerRef.current?.abort();
    streamAbortControllerRef.current = null;

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
  }, [navigate, routeConversationId]);

  // Dừng stream đang chạy nhưng giữ lại nội dung đã nhận được.
  const stopGenerating = () => {
    streamAbortControllerRef.current?.abort();
  };

  // Thêm tệp vào hàng đợi upload và cập nhật trạng thái từng tệp độc lập.
  const addFiles = (files: FileList | File[]) => {
    const availableSlots = Math.max(5 - selectedFiles.length, 0);
    const nextFiles = Array.from(files).slice(0, availableSlots);
    const nextSelectedFiles = nextFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      status: 'uploading' as const,
    }));

    setSelectedFiles((current) => [...current, ...nextSelectedFiles]);

    nextSelectedFiles.forEach((selectedFile) => {
      void uploadChatFile(selectedFile.file)
        .then((uploaded) => {
          setSelectedFiles((current) => current.map((item) => (
            item.id === selectedFile.id
              ? {
                ...item,
                status: 'ready',
                fileUpload: uploaded.fileUpload,
                error: undefined,
              }
              : item
          )));
        })
        .catch((err) => {
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
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
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

    // Khi backend tạo hội thoại/tin nhắn xong, hiển thị ngay tin nhắn đầu tiên.
    const handleReady = (event: StreamReadyEvent) => {
      if (historyResetVersionRef.current !== resetVersion) return;

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
      navigate(`/chat/${event.conversationId}`, { replace: !activeConversationId });
    };

    // Ghép token stream vào tin nhắn assistant tạm thời.
    const handleToken = (token: string) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      assistantMessage = {
        ...assistantMessage,
        content: assistantMessage.content + token,
      };
      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? assistantMessage : message
      )));
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
        setConversations((current) => {
          const exists = current.some((item) => item.id === conversation.id);
          return exists
            ? current.map((item) => item.id === conversation.id ? conversation : item)
            : [conversation, ...current];
        });
      } catch {
        // The streamed messages are already visible; conversation refresh can be retried later.
      }
    };

    try {
      const fileUploads = readyFiles.flatMap((file) => file.fileUpload ? [file.fileUpload] : []);

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
        onDone: handleDone,
        onError: setError,
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : 'Cannot send message');
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
  }), [conversations, activeConversationId, messages, prompt, selectedFiles, modelName, isLoading, isOpeningConversation, openingConversationId, isStreaming, error, selectConversation, startNewChat, clearChatHistoryState]);
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
