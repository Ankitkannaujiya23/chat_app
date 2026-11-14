export type ChatType = 'direct' | 'group';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ChatSummary {
  id: number;
  type: ChatType;
  memberIds: number[];
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: number;
  senderId: number;
  text: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  readBy: Record<string, string>;
}

export interface LastSeen {
  userId: number;
  messageId: string;
}
