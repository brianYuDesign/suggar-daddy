/**
 * Messaging 相關 DTO
 */

export interface SendMessageDto {
  conversationId: string;
  content: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface ConversationDto {
  id: string;
  participantIds: string[];
  lastMessageAt?: Date;
}
