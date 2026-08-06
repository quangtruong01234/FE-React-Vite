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
  user1LastReadAt: string | null;
  user2LastReadAt: string | null;
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
