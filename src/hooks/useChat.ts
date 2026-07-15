import { createContext, createElement, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { chatModelOptions } from './chat-models';
import { useChatConversations } from './useChatConversations';
import { useChatStreaming } from './useChatStreaming';
import { useChatUploads } from './useChatUploads';

export { chatModelOptions };
export type { ChatModelKey } from './chat-models';
export type { SelectedChatFile } from './useChatUploads';

type ChatContextValue = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatContextValue | null>(null);

function useChatState() {
  const [prompt, setPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const uploads = useChatUploads({ onError: setError });
  const {
    selectedFiles,
    selectedFilesRef,
    addFiles,
    removeFile,
    clearSelectedFiles,
    cleanupSelectedUploads,
    cleanupUploadedFiles,
    fileLimits,
    isWaitingForUploads,
    hasFailedUploads,
  } = uploads;
  const clearPrompt = useCallback(() => {
    setPrompt('');
  }, []);
  const conversationsState = useChatConversations({
    selectedFilesRef,
    cleanupSelectedUploads,
    clearSelectedFiles,
    clearPrompt,
    setError,
  });
  const {
    conversations,
    activeConversationId,
    messages,
    modelName,
    isLoading,
    isLoadingMoreConversations,
    hasMoreConversations,
    isOpeningConversation,
    openingConversationId,
    historyResetVersionRef,
    setActiveConversation,
    setConversations,
    setMessages,
    setModelName,
    selectConversation,
    loadMoreConversations,
    startNewChat: resetForNewChat,
    clearChatHistoryState: resetChatHistoryState,
    renameChat,
    deleteChat: deleteConversationState,
  } = conversationsState;
  const {
    abortStream,
    sendPrompt,
    stopGenerating,
  } = useChatStreaming({
    activeConversationId,
    historyResetVersionRef,
    isStreaming,
    modelName,
    prompt,
    selectedFiles,
    cleanupUploadedFiles,
    clearSelectedFiles,
    setActiveConversation,
    setConversations,
    setError,
    setIsStreaming,
    setMessages,
    setPrompt,
  });

  const startNewChat = useCallback(() => {
    abortStream();
    resetForNewChat();
  }, [abortStream, resetForNewChat]);

  const clearChatHistoryState = useCallback(() => {
    abortStream();
    resetChatHistoryState();
    setIsStreaming(false);
  }, [abortStream, resetChatHistoryState]);

  const deleteChat = useCallback(async (conversationId: string) => {
    if (activeConversationId === conversationId) {
      abortStream();
      setIsStreaming(false);
    }

    await deleteConversationState(conversationId);
  }, [abortStream, activeConversationId, deleteConversationState]);

  return useMemo(() => ({
    conversations,
    activeConversationId,
    messages,
    prompt,
    selectedFiles,
    modelName,
    isLoading,
    isLoadingMoreConversations,
    hasMoreConversations,
    isOpeningConversation,
    openingConversationId,
    isStreaming,
    isWaitingForUploads,
    hasFailedUploads,
    fileLimits,
    error,
    setPrompt,
    setModelName,
    addFiles,
    removeFile,
    selectConversation,
    loadMoreConversations,
    startNewChat,
    clearChatHistoryState,
    renameChat,
    deleteChat,
    stopGenerating,
    sendPrompt,
  }), [
    conversations,
    activeConversationId,
    messages,
    prompt,
    selectedFiles,
    modelName,
    isLoading,
    isLoadingMoreConversations,
    hasMoreConversations,
    isOpeningConversation,
    openingConversationId,
    isStreaming,
    isWaitingForUploads,
    hasFailedUploads,
    fileLimits,
    error,
    addFiles,
    removeFile,
    selectConversation,
    loadMoreConversations,
    startNewChat,
    clearChatHistoryState,
    renameChat,
    deleteChat,
    stopGenerating,
    sendPrompt,
    setModelName,
  ]);
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
