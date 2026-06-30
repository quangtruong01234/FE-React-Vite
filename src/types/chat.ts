// --- Chat ---

export interface ConversationLastMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
}

export interface Conversation {
  id: number;
  user1Id: number;
  user2Id: number;
  createdAt: string;
  user1LastReadAt: string | null;
  user2LastReadAt: string | null;
  lastMessage: ConversationLastMessage | null;
  unreadCount: number;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  parentMessageId: number | null;
  createdAt: string;
}

export interface CreateConversationDto {
  otherUserId: number;
}
