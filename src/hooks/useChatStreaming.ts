import { Dispatch, MutableRefObject, SetStateAction, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getConversation, sendMessageStream } from '@/services/chat.service';
import type { ChatMessage, Conversation, FileUpload, MessageStatus, StreamDoneEvent, StreamReadyEvent } from '@/types/chat.type';
import type { ChatModelKey } from './chat-models';
import type { SelectedChatFile } from './useChatUploads';

type UseChatStreamingInput = {
  activeConversationId: string | null;
  historyResetVersionRef: MutableRefObject<number>;
  isStreaming: boolean;
  modelName: ChatModelKey;
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
}: UseChatStreamingInput) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const streamAbortControllerRef = useRef<AbortController | null>(null);

  const stopGenerating = useCallback(() => {
    streamAbortControllerRef.current?.abort();
  }, []);

  const abortStream = useCallback(() => {
    streamAbortControllerRef.current?.abort();
    streamAbortControllerRef.current = null;
  }, []);

  const sendPrompt = useCallback(async () => {
    const content = prompt.trim();
    const filesToSend = selectedFiles;
    const hasPendingUploadsToSend = filesToSend.some((file) => (
      file.status === 'initializing'
      || file.status === 'uploading'
      || file.status === 'finalizing'
    ));
    const hasFailedUploadsToSend = filesToSend.some((file) => file.status === 'error');
    const readyFiles = filesToSend.filter((file) => file.status === 'ready' && file.fileUpload);

    if ((!content && !filesToSend.length) || isStreaming) return;
    if (hasPendingUploadsToSend) {
      setError('Please wait for the file to finish uploading.');
      return;
    }
    if (hasFailedUploadsToSend) {
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
      readyUserMessageId = userMessage.id;

      clearSelectedFiles();
      setMessages((current) => [...current, userMessage, assistantMessage]);
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
          appendAssistantStatus(t('chat.generationError', { message }), 'error', 'FAILED');
        },
      });

      if (didStreamFail && !didCompleteStream) {
        cleanupUploadedFiles(fileUploads);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updatePendingAssistantMessage(assistantMessage.content, 'stopped', 'SUCCESS', true);
      } else {
        const message = err instanceof Error ? err.message : 'Cannot send message';
        setError(message);
        appendAssistantStatus(t('chat.generationError', { message }), 'error', 'FAILED');
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
  }, [
    activeConversationId,
    cleanupUploadedFiles,
    clearSelectedFiles,
    historyResetVersionRef,
    isStreaming,
    modelName,
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
  ]);

  return {
    abortStream,
    sendPrompt,
    stopGenerating,
  };
}
