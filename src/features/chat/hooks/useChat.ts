import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { uploadChatFile } from '../api/file-upload.api';
import { deleteConversation, getConversation, getConversations, renameConversation, sendMessageStream } from '../api/chat.api';
import type { ChatMessage, Conversation, FileUpload, StreamDoneEvent, StreamReadyEvent } from '../types';

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
  fileContext?: string;
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
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [error, setError] = useState('');
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadConversations() {
      setIsLoading(true);
      setError('');

      try {
        const data = await getConversations();
        if (ignore) return;

        setConversations(data);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Cannot load conversations');
        }
      } finally {
        if (!ignore) {
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

  const selectConversation = useCallback(async (conversationId: string) => {
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
      setActiveConversation(conversation);
      setMessages(getConversationMessages(conversation));
      setModelName(normalizeModelName(conversation.modelName));
      setConversations((current) => current.map((item) => item.id === conversation.id ? conversation : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load conversation');
    } finally {
      setOpeningConversationId((current) => current === conversationId ? null : current);
    }
  }, [conversations]);

  useEffect(() => {
    if (!routeConversationId || routeConversationId === activeConversationId || openingConversationId === routeConversationId) {
      return;
    }

    void selectConversation(routeConversationId);
  }, [activeConversationId, openingConversationId, routeConversationId, selectConversation]);

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

  const stopGenerating = () => {
    streamAbortControllerRef.current?.abort();
  };

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
                fileContext: uploaded.fileContext,
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

  const removeFile = (index: number) => {
    setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

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
    setIsUploadingFiles(false);
    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;

    let assistantMessage = createPendingAssistantMessage(modelName);

    const handleReady = (event: StreamReadyEvent) => {
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

    const handleToken = (token: string) => {
      assistantMessage = {
        ...assistantMessage,
        content: assistantMessage.content + token,
      };
      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? assistantMessage : message
      )));
    };

    const handleDone = async (event: StreamDoneEvent) => {
      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? event.assistantMessage : message
      )));

      try {
        const conversation = await getConversation(event.conversationId);
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
      const fileContext = readyFiles
        .map((file) => file.fileContext)
        .filter(Boolean)
        .join('\n\n---\n\n');

      setSelectedFiles([]);

      await sendMessageStream({
        conversationId: activeConversationId,
        question,
        modelName,
        title: activeConversationId ? undefined : question.slice(0, 50),
        fileUploads,
        fileContext: fileContext || undefined,
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
      setIsUploadingFiles(false);
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
    isUploadingFiles,
    isWaitingForUploads: selectedFiles.some((file) => file.status === 'uploading'),
    hasFailedUploads: selectedFiles.some((file) => file.status === 'error'),
    error,
    setPrompt,
    setModelName,
    addFiles,
    removeFile,
    selectConversation,
    startNewChat,
    renameChat,
    deleteChat,
    stopGenerating,
    sendPrompt,
  }), [conversations, activeConversationId, messages, prompt, selectedFiles, modelName, isLoading, isOpeningConversation, openingConversationId, isStreaming, isUploadingFiles, error, selectConversation, startNewChat]);
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
