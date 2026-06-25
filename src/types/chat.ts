// --- Chat ---

export interface Conversation {
  id: number;
  user1Id: number;
  user2Id: number;
  createdAt: string;
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
