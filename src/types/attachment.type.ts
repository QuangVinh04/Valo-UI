export type AttachmentItem = {
  id: string;
  messageId?: string | null;
  name: string;
  mime: string;
  url?: string | null;
  size?: number | null;
  createdAt: string;
};

export type DeleteAttachmentsResult = {
  deletedCount: number;
  notFoundIds: string[];
};
