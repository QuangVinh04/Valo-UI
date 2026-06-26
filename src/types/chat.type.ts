export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  content: string;
  senderType: ChatRole;
  modelName: string | null;
  createdAt: string;
  fileUploads?: FileUpload[];
};

export type FileUpload = {
  data: string;
  name: string;
  type: 'url';
  mime: string;
  size?: number;
};

export type Conversation = {
  id: string;
  title: string;
  modelName: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
};

export type StreamReadyEvent = {
  conversationId: string;
  userMessage: ChatMessage;
};

export type StreamDoneEvent = {
  conversationId: string;
  assistantMessage: ChatMessage;
};

export type StreamHandlers = {
  onReady: (event: StreamReadyEvent) => void;
  onToken: (content: string) => void;
  onDone: (event: StreamDoneEvent) => void;
  onError: (message: string) => void;
};
