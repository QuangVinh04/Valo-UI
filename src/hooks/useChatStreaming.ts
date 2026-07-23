import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getConversation, sendMessageStream } from '@/services/chat.service';
import type { ChatMessage, Conversation, FileUpload, MessageStatus, StreamDoneEvent, StreamReadyEvent } from '@/types/chat.type';
import type { ChatModelKey } from './chat-models';
import type { SelectedChatFile } from './useChatUploads';
import { getLatestMessagePath } from './chat-branches';

type UseChatStreamingInput = {
  activeConversationId: string | null;
  allMessages?: ChatMessage[];
  historyResetVersionRef: MutableRefObject<number>;
  isStreaming: boolean;
  modelName: ChatModelKey;
  messages: ChatMessage[];
  prompt: string;
  selectedFiles: SelectedChatFile[];
  cleanupUploadedFiles: (fileUploads: FileUpload[]) => void;
  clearSelectedFiles: () => void;
  setActiveConversation: Dispatch<SetStateAction<Conversation | null>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setError: Dispatch<SetStateAction<string>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setPrompt: Dispatch<SetStateAction<string>>;
};

function getConversationMessages(conversation: Conversation): ChatMessage[] {
  return getLatestMessagePath(conversation.messages);
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

function updateMessagesStatus(messages: ChatMessage[] | undefined, messageId: string, status: MessageStatus): ChatMessage[] | undefined {
  if (!messages) return messages;

  return messages.map((message) => (
    message.id === messageId ? { ...message, status } : message
  ));
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

export function useChatStreaming({
  activeConversationId,
  allMessages,
  historyResetVersionRef,
  isStreaming,
  modelName,
  messages,
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
}: UseChatStreamingInput) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const knownMessagesRef = useRef<Map<string, Map<string, ChatMessage>>>(new Map());

  const rememberMessages = useCallback((conversationId: string, nextMessages: ChatMessage[]) => {
    const knownMessages = knownMessagesRef.current.get(conversationId) ?? new Map<string, ChatMessage>();
    nextMessages.forEach((message, index) => {
      const normalizedMessage = message.parentMessageId === undefined && index > 0
        ? { ...message, parentMessageId: nextMessages[index - 1]?.id }
        : message;
      knownMessages.set(normalizedMessage.id, normalizedMessage);
    });
    knownMessagesRef.current.set(conversationId, knownMessages);
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      rememberMessages(activeConversationId, allMessages ?? messages);
    }
  }, [activeConversationId, allMessages, messages, rememberMessages]);

  const getKnownMessages = useCallback(() => {
    const knownMessages = new Map(
      activeConversationId
        ? knownMessagesRef.current.get(activeConversationId)
        : undefined
    );

    allMessages?.forEach((message) => knownMessages.set(message.id, message));
    messages.forEach((message) => knownMessages.set(message.id, message));

    return knownMessages;
  }, [activeConversationId, allMessages, messages]);

  const stopGenerating = useCallback(() => {
    streamAbortControllerRef.current?.abort();
  }, []);

  const abortStream = useCallback(() => {
    streamAbortControllerRef.current?.abort();
    streamAbortControllerRef.current = null;
  }, []);

  const sendPrompt = useCallback(async (branchInput?: {
    question: string;
    parentMessageId?: string;
    retryMessageId?: string;
    baseMessages: ChatMessage[];
    fileUploads?: FileUpload[];
  }) => {
    const content = branchInput ? branchInput.question.trim() : prompt.trim();
    const filesToSend = branchInput ? [] : selectedFiles;
    const hasPendingUploadsToSend = filesToSend.some((file) => (
      file.status === 'initializing'
      || file.status === 'uploading'
      || file.status === 'finalizing'
    ));
    const hasFailedUploadsToSend = filesToSend.some((file) => file.status === 'error');
    const readyFiles = filesToSend.filter((file) => file.status === 'ready' && file.fileUpload);

    if ((!content && !filesToSend.length && !branchInput?.fileUploads?.length) || isStreaming) return;
    if (hasPendingUploadsToSend) {
      setError('Please wait for the file to finish uploading.');
      return;
    }
    if (hasFailedUploadsToSend) {
      setError('Please remove failed uploads before sending.');
      return;
    }

    const question = content || 'Please analyze the attached file.';

    if (!branchInput) {
      setPrompt('');
    }
    setError('');
    setIsStreaming(true);
    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;
    const resetVersion = historyResetVersionRef.current;
    let readyUserMessageId: string | null = null;

    let assistantMessage = createPendingAssistantMessage(modelName);

    const updatePendingAssistantMessage = (
      nextContent: string,
      streamStatus?: ChatMessage['streamStatus'],
      status?: MessageStatus,
      isUserStopped?: boolean
    ) => {
      assistantMessage = {
        ...assistantMessage,
        content: nextContent,
        streamStatus,
        ...(typeof isUserStopped === 'boolean' ? { isUserStopped } : {}),
        ...(status ? { status } : {}),
      };

      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? assistantMessage : message
      )));
    };

    const appendAssistantStatus = (
      statusMessage: string,
      streamStatus?: ChatMessage['streamStatus'],
      status?: MessageStatus
    ) => {
      const nextContent = assistantMessage.content.trim()
        ? `${assistantMessage.content.trimEnd()}\n\n${statusMessage}`
        : statusMessage;

      updatePendingAssistantMessage(nextContent, streamStatus, status);
    };

    const updateUserMessageStatus = (messageId: string, status: MessageStatus) => {
      setMessages((current) => updateMessagesStatus(current, messageId, status) ?? current);
      setActiveConversation((current) => current
        ? { ...current, messages: updateMessagesStatus(current.messages, messageId, status) }
        : current);
      setConversations((current) => current.map((conversation) => ({
        ...conversation,
        messages: updateMessagesStatus(conversation.messages, messageId, status),
      })));
    };

    const handleReady = (event: StreamReadyEvent) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      const now = new Date().toISOString();
      const userMessage = {
        ...event.userMessage,
        status: event.userMessage.status ?? 'PENDING',
      };
      assistantMessage = event.assistantMessage;

      if (!branchInput) {
        clearSelectedFiles();
      }
      const nextMessages = branchInput?.retryMessageId
        ? [...(branchInput.baseMessages ?? messages), assistantMessage]
        : [...(branchInput?.baseMessages ?? messages), userMessage, assistantMessage];
      if (!branchInput?.retryMessageId) {
        readyUserMessageId = userMessage.id;
      }
      rememberMessages(event.conversationId, nextMessages);
      setMessages(nextMessages);
      setActiveConversation((current) => current ?? {
        id: event.conversationId,
        title: question.slice(0, 50),
        modelName,
        userId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [userMessage],
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
            messages: [userMessage],
          };

        return upsertConversationAtTop(current, conversation);
      });
      navigate(`/chat/${event.conversationId}`, { replace: !activeConversationId });
    };

    const handleToken = (token: string) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      assistantMessage = {
        ...assistantMessage,
        content: assistantMessage.content + token,
      };
      updatePendingAssistantMessage(assistantMessage.content);
    };

    const handleDone = async (event: StreamDoneEvent) => {
      if (historyResetVersionRef.current !== resetVersion) return;

      if (readyUserMessageId) {
        updateUserMessageStatus(readyUserMessageId, 'SUCCESS');
      }

      setMessages((current) => current.map((message) => (
        message.id === assistantMessage.id ? event.assistantMessage : message
      )));
      rememberMessages(event.conversationId, [event.assistantMessage]);

      try {
        const conversation = await getConversation(event.conversationId);
        if (historyResetVersionRef.current !== resetVersion) return;

        setActiveConversation(conversation);
        const refreshedMessages = getConversationMessages(conversation);
        rememberMessages(conversation.id, refreshedMessages);
        setMessages(refreshedMessages);
        setConversations((current) => upsertConversationAtTop(current, conversation));
      } catch {
        // The streamed messages are already visible; conversation refresh can be retried later.
      }
    };

    let didCompleteStream = false;
    let didStreamFail = false;
    const newlyUploadedFiles = readyFiles.flatMap((file) => file.fileUpload ? [file.fileUpload] : []);
    const fileUploads = branchInput?.fileUploads ?? newlyUploadedFiles;
    const parentMessageId = branchInput
      ? branchInput.parentMessageId
      : (activeConversationId ? messages[messages.length - 1]?.id : undefined);

    try {
      await sendMessageStream({
        conversationId: activeConversationId,
        question,
        modelName,
        parentMessageId,
        retryMessageId: branchInput?.retryMessageId,
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
          appendAssistantStatus(t('chat.generationError', { message }), 'error', 'FAILED');
        },
      });

      if (didStreamFail && !didCompleteStream && !readyUserMessageId) {
        cleanupUploadedFiles(newlyUploadedFiles);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updatePendingAssistantMessage(assistantMessage.content, 'stopped', 'SUCCESS', true);
      } else {
        const message = err instanceof Error ? err.message : 'Cannot send message';
        setError(message);
        appendAssistantStatus(t('chat.generationError', { message }), 'error', 'FAILED');
      }

      if (!didCompleteStream && !readyUserMessageId) {
        cleanupUploadedFiles(newlyUploadedFiles);
      }
    } finally {
      if (streamAbortControllerRef.current === abortController) {
        streamAbortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  }, [
    activeConversationId,
    cleanupUploadedFiles,
    clearSelectedFiles,
    historyResetVersionRef,
    isStreaming,
    modelName,
    messages,
    navigate,
    prompt,
    selectedFiles,
    setActiveConversation,
    setConversations,
    setError,
    setIsStreaming,
    setMessages,
    setPrompt,
    t,
    rememberMessages,
  ]);

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!activeConversationId || isStreaming) return;

    const messageIndex = messages.findIndex((message) => message.id === messageId);
    const message = messages[messageIndex];
    const nextContent = content.trim();
    if (!message || message.senderType !== 'user' || !nextContent) return;

    rememberMessages(activeConversationId, messages);
    await sendPrompt({
      question: nextContent,
      parentMessageId: message.parentMessageId
        ?? (messageIndex > 0 ? messages[messageIndex - 1]?.id : undefined),
      baseMessages: messages.slice(0, messageIndex),
      fileUploads: message.fileUploads,
    });
  }, [activeConversationId, isStreaming, messages, rememberMessages, sendPrompt]);

  const retryAssistantMessage = useCallback(async (messageId: string) => {
    if (!activeConversationId || isStreaming) return;

    const messageIndex = messages.findIndex((message) => message.id === messageId);
    const message = messages[messageIndex];
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : undefined;
    if (
      !message
      || message.senderType !== 'assistant'
      || !userMessage
      || userMessage.senderType !== 'user'
      || message.id.startsWith('assistant-')
    ) {
      return;
    }

    rememberMessages(activeConversationId, messages);
    await sendPrompt({
      question: userMessage.content || 'Please analyze the attached file.',
      retryMessageId: message.id,
      baseMessages: messages.slice(0, messageIndex),
    });
  }, [activeConversationId, isStreaming, messages, rememberMessages, sendPrompt]);

  const getMessageBranchInfo = useCallback((messageId: string) => {
    if (!activeConversationId) return { index: 1, count: 1 };

    const currentMessage = messages.find((message) => message.id === messageId);
    const knownMessages = getKnownMessages();
    if (!currentMessage || !knownMessages.size) return { index: 1, count: 1 };

    const siblings = [...knownMessages.values()]
      .filter((message) => (
        message.senderType === currentMessage.senderType
        && message.parentMessageId === currentMessage.parentMessageId
      ))
      .sort((left, right) => (
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      ));
    const currentIndex = siblings.findIndex((message) => message.id === messageId);

    return {
      index: currentIndex >= 0 ? currentIndex + 1 : 1,
      count: Math.max(siblings.length, 1),
    };
  }, [activeConversationId, getKnownMessages, messages]);

  const switchMessageBranch = useCallback((messageId: string, direction: -1 | 1) => {
    if (!activeConversationId || isStreaming) return;

    const knownMessages = getKnownMessages();
    const currentMessage = messages.find((message) => message.id === messageId);
    if (!knownMessages.size || !currentMessage) return;

    const siblings = [...knownMessages.values()]
      .filter((message) => (
        message.senderType === currentMessage.senderType
        && message.parentMessageId === currentMessage.parentMessageId
      ))
      .sort((left, right) => (
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      ));
    const currentIndex = siblings.findIndex((message) => message.id === messageId);
    const nextSibling = siblings[currentIndex + direction];
    if (!nextSibling) return;

    const path: ChatMessage[] = [];
    const visited = new Set<string>();
    let cursor: ChatMessage | undefined = nextSibling;

    while (cursor && !visited.has(cursor.id)) {
      path.unshift(cursor);
      visited.add(cursor.id);
      cursor = cursor.parentMessageId ? knownMessages.get(cursor.parentMessageId) : undefined;
    }

    cursor = nextSibling;
    while (cursor) {
      const children = [...knownMessages.values()]
        .filter((message) => message.parentMessageId === cursor?.id)
        .sort((left, right) => (
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        ));
      const nextChild = children[children.length - 1];
      if (!nextChild || visited.has(nextChild.id)) break;
      path.push(nextChild);
      visited.add(nextChild.id);
      cursor = nextChild;
    }

    setMessages(path);
  }, [activeConversationId, getKnownMessages, isStreaming, messages, setMessages]);

  return {
    abortStream,
    editMessage,
    getMessageBranchInfo,
    retryAssistantMessage,
    sendPrompt,
    switchMessageBranch,
    stopGenerating,
  };
}
