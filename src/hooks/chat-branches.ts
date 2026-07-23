import type { ChatMessage } from '@/types/chat.type';

function compareMessagesByCreatedAt(left: ChatMessage, right: ChatMessage): number {
  const timeDifference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

  return timeDifference || left.id.localeCompare(right.id);
}

export function getLatestMessagePath(messages: ChatMessage[] | undefined): ChatMessage[] {
  if (!messages?.length) return [];

  const messagesById = new Map(messages.map((message) => [message.id, message]));
  const sortedMessages = [...messages].sort(compareMessagesByCreatedAt);
  const latestMessage = sortedMessages[sortedMessages.length - 1];
  if (!latestMessage) return [];

  const path: ChatMessage[] = [];
  const visitedIds = new Set<string>();
  let currentMessage: ChatMessage | undefined = latestMessage;

  while (currentMessage && !visitedIds.has(currentMessage.id)) {
    path.unshift(currentMessage);
    visitedIds.add(currentMessage.id);
    currentMessage = currentMessage.parentMessageId
      ? messagesById.get(currentMessage.parentMessageId)
      : undefined;
  }

  return path;
}
