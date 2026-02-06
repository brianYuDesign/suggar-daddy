import { Injectable, Logger } from '@nestjs/common';
import type { MessageDto, ConversationDto } from '@suggar-daddy/dto';

/**
 * 架構：讀取 Redis、寫入 Kafka；Phase 1 in-memory mock。
 */
interface StoredMessage extends MessageDto {
  createdAt: Date;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private messages: StoredMessage[] = [];
  private conversations: Map<string, string[]> = new Map(); // conversationId -> [userId, userId]

  async send(
    senderId: string,
    conversationId: string,
    content: string
  ): Promise<MessageDto> {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const msg: StoredMessage = {
      id,
      conversationId,
      senderId,
      content,
      createdAt: now,
    };
    this.messages.push(msg);
    this.logger.log(`message sent id=${id} conversationId=${conversationId} senderId=${senderId}`);
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt,
    };
  }

  async getConversations(userId: string): Promise<ConversationDto[]> {
    const result: ConversationDto[] = [];
    for (const [convId, participantIds] of this.conversations) {
      if (participantIds.includes(userId)) {
        const convMessages = this.messages
          .filter((m) => m.conversationId === convId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        result.push({
          id: convId,
          participantIds,
          lastMessageAt: convMessages[0]?.createdAt,
        });
      }
    }
    result.sort(
      (a, b) =>
        (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)
    );
    return result;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number,
    cursor?: string
  ): Promise<{ messages: MessageDto[]; nextCursor?: string }> {
    const participantIds = this.conversations.get(conversationId);
    if (!participantIds || !participantIds.includes(userId)) {
      return { messages: [] };
    }
    let list = this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let start = 0;
    if (cursor) {
      const idx = list.findIndex((m) => m.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = list.slice(start, start + limit);
    const nextCursor =
      start + limit < list.length ? slice[slice.length - 1]?.id : undefined;

    return {
      messages: slice.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        createdAt: m.createdAt,
      })),
      nextCursor,
    };
  }

  /** 建立或取得對話（配對後可呼叫） */
  ensureConversation(userAId: string, userBId: string): string {
    const key = [userAId, userBId].sort().join('::');
    if (!this.conversations.has(key)) {
      this.conversations.set(key, [userAId, userBId]);
      this.logger.log(`conversation created id=${key} users=${userAId},${userBId}`);
    }
    return key;
  }

  /** 檢查用戶是否為該對話參與者（用於發送前授權） */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participantIds = this.conversations.get(conversationId);
    return Boolean(participantIds?.includes(userId));
  }
}
