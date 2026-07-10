import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import { defaultModel, normalizeModelName } from './chat-models';
import type { SelectedChatFile } from './useChatUploads';
import { deleteConversation, getConversation, getConversations, renameConversation } from '@/services/chat.service';
import type { ChatMessage, Conversation } from '@/types/chat.type';

type UseChatConversationsInput = {
  selectedFilesRef: MutableRefObject<SelectedChatFile[]>;
  cleanupSelectedUploads: (files: SelectedChatFile[]) => void;
  clearSelectedFiles: () => void;
  clearPrompt: () => void;
  setError: Dispatch<SetStateAction<string>>;
};

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

export function useChatConversations({
  selectedFilesRef,
  cleanupSelectedUploads,
  clearSelectedFiles,
  clearPrompt,
  setError,
}: UseChatConversationsInput) {
  const navigate = useNavigate();
  const location = useLocation();
  const chatRouteMatch = useMatch('/chat/:conversationId');
  const routeConversationId = chatRouteMatch?.params.conversationId ?? null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [modelName, setModelName] = useState(defaultModel);
  const [isLoading, setIsLoading] = useState(true);
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const historyResetVersionRef = useRef(0);

  useEffect(() => {
    if (location.pathname.startsWith('/chat') || selectedFilesRef.current.length === 0) {
      return;
    }

    cleanupSelectedUploads(selectedFilesRef.current);
    clearSelectedFiles();
  }, [cleanupSelectedUploads, clearSelectedFiles, location.pathname, selectedFilesRef]);

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
  }, [setError]);

  const activeConversationId = activeConversation?.id ?? null;
  const isOpeningConversation = openingConversationId !== null;

  // Mở một hội thoại, ưu tiên dữ liệu cache để UI phản hồi nhanh rồi làm mới từ API.
  const selectConversation = useCallback(async (conversationId: string) => {
    const resetVersion = historyResetVersionRef.current;

    setError('');
    cleanupSelectedUploads(selectedFilesRef.current);
    clearSelectedFiles();
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
  }, [cleanupSelectedUploads, clearSelectedFiles, conversations, selectedFilesRef, setError]);

  useEffect(() => {
    if (!routeConversationId || routeConversationId === activeConversationId || openingConversationId === routeConversationId) {
      return;
    }

    void selectConversation(routeConversationId);
  }, [activeConversationId, openingConversationId, routeConversationId, selectConversation]);

  // Reset vùng chat để bắt đầu hội thoại mới.
  const startNewChat = useCallback(() => {
    cleanupSelectedUploads(selectedFilesRef.current);
    setActiveConversation(null);
    setMessages([]);
    clearPrompt();
    clearSelectedFiles();
    setError('');
    setOpeningConversationId(null);
    navigate('/chat');
  }, [cleanupSelectedUploads, clearPrompt, clearSelectedFiles, navigate, selectedFilesRef, setError]);

  // Xóa toàn bộ trạng thái chat trong bộ nhớ sau khi backend đã xóa lịch sử.
  const clearChatHistoryState = useCallback(() => {
    historyResetVersionRef.current += 1;
    cleanupSelectedUploads(selectedFilesRef.current);

    setConversations([]);
    setActiveConversation(null);
    setMessages([]);
    clearPrompt();
    clearSelectedFiles();
    setIsLoading(false);
    setError('');
    setOpeningConversationId(null);

    if (routeConversationId) {
      navigate('/chat', { replace: true });
    }
  }, [cleanupSelectedUploads, clearPrompt, clearSelectedFiles, navigate, routeConversationId, selectedFilesRef, setError]);

  // Đổi tên hội thoại và đồng bộ lại cả sidebar lẫn hội thoại đang mở.
  const renameChat = useCallback(async (conversationId: string, title: string) => {
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
  }, [setError]);

  // Xóa một hội thoại; nếu đang mở hội thoại đó thì quay về chat mới.
  const deleteChat = useCallback(async (conversationId: string) => {
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
  }, [activeConversationId, setError, startNewChat]);

  return useMemo(() => ({
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    modelName,
    isLoading,
    isOpeningConversation,
    openingConversationId,
    historyResetVersionRef,
    setActiveConversation,
    setConversations,
    setMessages,
    setModelName,
    selectConversation,
    startNewChat,
    clearChatHistoryState,
    renameChat,
    deleteChat,
    upsertConversationAtTop,
  }), [
    conversations,
    activeConversation,
    activeConversationId,
    messages,
    modelName,
    isLoading,
    isOpeningConversation,
    openingConversationId,
    selectConversation,
    startNewChat,
    clearChatHistoryState,
    renameChat,
    deleteChat,
  ]);
}
