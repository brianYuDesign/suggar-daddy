import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import type { MessageDto, ConversationDto } from '@suggar-daddy/dto';

const CONV_KEY = (id: string) => `conversation:${id}`;
const USER_CONVS = (userId: string) => `user:${userId}:conversations`;
const CONV_MESSAGES = (convId: string) => `conversation:${convId}:messages`;
const MSG_KEY = (id: string) => `msg:${id}`;

interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /** 建立或取得對話（配對後可呼叫） */
  async ensureConversation(userAId: string, userBId: string): Promise<string> {
    const id = [userAId, userBId].sort().join('::');
    const key = CONV_KEY(id);
    const raw = await this.redis.get(key);
    if (!raw) {
      const participantIds = [userAId, userBId];
      await this.redis.set(key, JSON.stringify({ id, participantIds }));
      await this.redis.sAdd(USER_CONVS(userAId), id);
      await this.redis.sAdd(USER_CONVS(userBId), id);
      this.logger.log(`conversation created id=${id} users=${userAId},${userBId}`);
    }
    return id;
  }

  async send(
    senderId: string,
    conversationId: string,
    content: string
  ): Promise<MessageDto> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) {
      throw new Error('Conversation not found');
    }
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const stored: StoredMessage = {
      id: msgId,
      conversationId,
      senderId,
      content,
      createdAt: now.toISOString(),
    };
    await this.redis.set(MSG_KEY(msgId), JSON.stringify(stored));
    await this.redis.lPush(CONV_MESSAGES(conversationId), msgId);
    this.logger.log(`message sent id=${msgId} conversationId=${conversationId} senderId=${senderId}`);
    try {
      await this.kafkaProducer.sendEvent('message.created', {
        messageId: msgId,
        conversationId,
        senderId,
        content,
        createdAt: stored.createdAt,
      });
    } catch (e) {
      this.logger.warn('Kafka message.created emit failed', e);
    }
    return {
      id: stored.id,
      conversationId: stored.conversationId,
      senderId: stored.senderId,
      content: stored.content,
      createdAt: now,
    };
  }

  async getConversations(userId: string): Promise<ConversationDto[]> {
    const convIds = await this.redis.sMembers(USER_CONVS(userId));
    const result: ConversationDto[] = [];
    for (const convId of convIds) {
      const raw = await this.redis.get(CONV_KEY(convId));
      if (!raw) continue;
      const conv = JSON.parse(raw);
      const msgIds = await this.redis.lRange(CONV_MESSAGES(convId), 0, 0);
      let lastMessageAt: Date | undefined;
      if (msgIds.length) {
        const lastRaw = await this.redis.get(MSG_KEY(msgIds[0]));
        if (lastRaw) {
          const m = JSON.parse(lastRaw) as StoredMessage;
          lastMessageAt = new Date(m.createdAt);
        }
      }
      result.push({
        id: conv.id,
        participantIds: conv.participantIds,
        lastMessageAt,
      });
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
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) return { messages: [] };
    const conv = JSON.parse(convRaw);
    if (!conv.participantIds?.includes(userId)) return { messages: [] };
    const msgIds = await this.redis.lRange(CONV_MESSAGES(conversationId), 0, -1);
    const messages: MessageDto[] = [];
    for (const id of msgIds) {
      const raw = await this.redis.get(MSG_KEY(id));
      if (raw) {
        const m = JSON.parse(raw) as StoredMessage;
        messages.push({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          createdAt: new Date(m.createdAt),
        });
      }
    }
    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    let start = 0;
    if (cursor) {
      const idx = messages.findIndex((m) => m.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = messages.slice(start, start + limit);
    const nextCursor =
      start + limit < messages.length ? slice[slice.length - 1]?.id : undefined;
    return { messages: slice, nextCursor };
  }

  /** 檢查用戶是否為該對話參與者（用於發送前授權） */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const raw = await this.redis.get(CONV_KEY(conversationId));
    if (!raw) return false;
    const conv = JSON.parse(raw);
    return Boolean(conv.participantIds?.includes(userId));
  }
}
