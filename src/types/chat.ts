// --- Chat ---

export interface ConversationLastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  // OVERFETCH-01: the two read cursors stayed server-side — `unreadCount` is
  // already derived from them, so the raw timestamps are no longer sent.
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  parentMessageId: string | null;
  createdAt: string;
}

export interface CreateConversationDto {
  otherUserId: string;
}
