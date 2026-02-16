import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MESSAGING_EVENTS, InjectLogger } from '@suggar-daddy/common';
import type {
  MessageDto,
  ConversationDto,
  MessageAttachmentDto,
  BroadcastDto,
} from '@suggar-daddy/dto';
import { SubscriptionServiceClient } from './subscription-service.client';

const CONV_KEY = (id: string) => `conversation:${id}`;
const USER_CONVS = (userId: string) => `user:${userId}:conversations`;
const CONV_MESSAGES = (convId: string) => `conversation:${convId}:messages`;
const MSG_KEY = (id: string) => `msg:${id}`;
const USER_KEY = (id: string) => `user:${id}`;
const USER_BLOCKS = (userId: string) => `user:blocks:${userId}`;
const DM_UNLOCK_KEY = (senderId: string, creatorId: string) =>
  `dm:unlock:${senderId}:${creatorId}`;
const BROADCAST_KEY = (id: string) => `broadcast:${id}`;
const USER_BROADCASTS = (userId: string) => `user:${userId}:broadcasts`;
const USER_FOLLOWERS = (userId: string) => `user:followers:${userId}`;

interface StoredAttachment {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

interface StoredMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: StoredAttachment[];
  createdAt: string;
}

@Injectable()
export class MessagingService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly subscriptionClient: SubscriptionServiceClient,
  ) {}

  /** 建立或取得對話（配對後可呼叫） */
  async ensureConversation(
    userAId: string,
    userBId: string,
  ): Promise<string> {
    const id = [userAId, userBId].sort().join('::');
    const key = CONV_KEY(id);
    const raw = await this.redis.get(key);
    if (!raw) {
      const participantIds = [userAId, userBId];
      await this.redis.set(key, JSON.stringify({ id, participantIds }));
      await this.redis.sAdd(USER_CONVS(userAId), id);
      await this.redis.sAdd(USER_CONVS(userBId), id);
      this.logger.log(
        `conversation created id=${id} users=${userAId},${userBId}`,
      );
    }
    return id;
  }

  async send(
    senderId: string,
    conversationId: string,
    content: string,
    attachments?: MessageAttachmentDto[],
  ): Promise<MessageDto> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) {
      throw new Error('Conversation not found');
    }
    const conv = JSON.parse(convRaw) as {
      id: string;
      participantIds: string[];
    };

    // Determine the recipient (the other participant)
    const recipientId = conv.participantIds.find((p) => p !== senderId);
    if (!recipientId) {
      throw new Error('Cannot determine recipient');
    }

    // Block check: if recipient has blocked the sender, reject
    const isBlocked = await this.redis.sIsMember(
      USER_BLOCKS(recipientId),
      senderId,
    );
    if (isBlocked) {
      throw new HttpException(
        'You cannot send messages to this user',
        HttpStatus.FORBIDDEN,
      );
    }

    // Paid DM check: if recipient has a dmPrice, check authorization
    const recipientRaw = await this.redis.get(USER_KEY(recipientId));
    if (recipientRaw) {
      const recipient = JSON.parse(recipientRaw);
      if (recipient.dmPrice && recipient.dmPrice > 0) {
        // Check if sender has active subscription to recipient
        const hasSubscription =
          await this.subscriptionClient.hasActiveSubscription(
            senderId,
            recipientId,
          );

        if (!hasSubscription) {
          // Check if sender has purchased DM access
          const hasDmAccess = await this.redis.exists(
            DM_UNLOCK_KEY(senderId, recipientId),
          );

          if (!hasDmAccess) {
            throw new HttpException(
              `This creator requires a DM payment of $${recipient.dmPrice} to message. Purchase DM access first.`,
              HttpStatus.PAYMENT_REQUIRED,
            );
          }
        }
      }
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
    if (attachments && attachments.length > 0) {
      stored.attachments = attachments.map((a) => ({
        id: a.id,
        type: a.type,
        url: a.url,
        thumbnailUrl: a.thumbnailUrl,
      }));
    }

    await this.redis.set(MSG_KEY(msgId), JSON.stringify(stored));
    await this.redis.lPush(CONV_MESSAGES(conversationId), msgId);
    this.logger.log(
      `message sent id=${msgId} conversationId=${conversationId} senderId=${senderId}`,
    );
    try {
      await this.kafkaProducer.sendEvent('message.created', {
        messageId: msgId,
        conversationId,
        senderId,
        content,
        attachments: stored.attachments,
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
      attachments: stored.attachments,
      createdAt: now,
    };
  }

  async getConversations(userId: string): Promise<ConversationDto[]> {
    const convIds = await this.redis.sMembers(USER_CONVS(userId));
    // Batch fetch all conversations
    const convKeys = convIds.map((id) => CONV_KEY(id));
    const convValues = await this.redis.mget(...convKeys);

    const validConvs: {
      conv: { id: string; participantIds: string[] };
      convId: string;
    }[] = [];
    for (let i = 0; i < convIds.length; i++) {
      if (convValues[i]) {
        validConvs.push({
          conv: JSON.parse(convValues[i]!),
          convId: convIds[i],
        });
      }
    }

    // Filter out conversations where the other participant has blocked the user
    const blockCheckPromises = validConvs.map(({ conv }) => {
      const otherId = conv.participantIds.find((p) => p !== userId);
      if (!otherId) return Promise.resolve(false);
      return this.redis.sIsMember(USER_BLOCKS(otherId), userId);
    });
    const blockResults = await Promise.all(blockCheckPromises);

    const filteredConvs = validConvs.filter((_, i) => !blockResults[i]);

    // Fetch last message ID for each conversation
    const lastMsgIdPromises = filteredConvs.map(({ convId }) =>
      this.redis.lRange(CONV_MESSAGES(convId), 0, 0),
    );
    const lastMsgIds = await Promise.all(lastMsgIdPromises);

    // Batch fetch last messages
    const msgKeysToFetch: string[] = [];
    const msgIndexMap: number[] = [];
    for (let i = 0; i < lastMsgIds.length; i++) {
      if (lastMsgIds[i].length) {
        msgKeysToFetch.push(MSG_KEY(lastMsgIds[i][0]));
        msgIndexMap.push(i);
      }
    }
    const msgValues = msgKeysToFetch.length
      ? await this.redis.mget(...msgKeysToFetch)
      : [];

    const lastMessageAtMap = new Map<number, Date>();
    for (let i = 0; i < msgValues.length; i++) {
      if (msgValues[i]) {
        const m = JSON.parse(msgValues[i]!) as StoredMessage;
        lastMessageAtMap.set(msgIndexMap[i], new Date(m.createdAt));
      }
    }

    const result: ConversationDto[] = filteredConvs.map(({ conv }, i) => ({
      id: conv.id,
      participantIds: conv.participantIds,
      lastMessageAt: lastMessageAtMap.get(i),
    }));

    result.sort(
      (a, b) =>
        (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0),
    );
    return result;
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ messages: MessageDto[]; nextCursor?: string }> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) return { messages: [] };
    const conv = JSON.parse(convRaw);
    if (!conv.participantIds?.includes(userId)) return { messages: [] };
    const msgIds = await this.redis.lRange(
      CONV_MESSAGES(conversationId),
      0,
      -1,
    );
    const msgKeys = msgIds.map((id) => MSG_KEY(id));
    const msgValues = await this.redis.mget(...msgKeys);
    const messages: MessageDto[] = msgValues
      .filter(Boolean)
      .map((raw) => {
        const m = JSON.parse(raw!) as StoredMessage;
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          attachments: m.attachments,
          createdAt: new Date(m.createdAt),
        };
      });
    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    let start = 0;
    if (cursor) {
      const idx = messages.findIndex((m) => m.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = messages.slice(start, start + limit);
    const nextCursor =
      start + limit < messages.length
        ? slice[slice.length - 1]?.id
        : undefined;
    return { messages: slice, nextCursor };
  }

  /** 檢查用戶是否為該對話參與者（用於發送前授權） */
  async isParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const raw = await this.redis.get(CONV_KEY(conversationId));
    if (!raw) return false;
    const conv = JSON.parse(raw);
    return Boolean(conv.participantIds?.includes(userId));
  }

  // ── Broadcast messaging ─────────────────────────────────────

  async sendBroadcast(
    creatorId: string,
    content: string,
    audience: 'followers' | 'subscribers' = 'followers',
  ): Promise<BroadcastDto> {
    // Get recipient list based on audience
    const recipientIds = await this.redis.sMembers(
      USER_FOLLOWERS(creatorId),
    );

    const broadcastId = `bc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const broadcast: BroadcastDto = {
      id: broadcastId,
      creatorId,
      content,
      audience,
      recipientCount: recipientIds.length,
      createdAt: now,
    };

    // Store broadcast with 24h TTL
    await this.redis.set(
      BROADCAST_KEY(broadcastId),
      JSON.stringify(broadcast),
      86400,
    );

    // Push broadcast ID to each recipient's broadcasts list
    const pushPromises = recipientIds.map((recipientId) =>
      this.redis.lPush(USER_BROADCASTS(recipientId), broadcastId),
    );
    await Promise.all(pushPromises);

    // Emit Kafka event
    try {
      await this.kafkaProducer.sendEvent(MESSAGING_EVENTS.BROADCAST_SENT, {
        broadcastId,
        creatorId,
        content,
        recipientCount: recipientIds.length,
        createdAt: now,
      });
    } catch (e) {
      this.logger.warn('Kafka BROADCAST_SENT emit failed', e);
    }

    this.logger.log(
      `broadcast sent id=${broadcastId} creator=${creatorId} recipients=${recipientIds.length}`,
    );

    return broadcast;
  }

  async getBroadcasts(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ broadcasts: BroadcastDto[]; total: number }> {
    const allIds = await this.redis.lRange(
      USER_BROADCASTS(userId),
      0,
      -1,
    );

    if (allIds.length === 0) {
      return { broadcasts: [], total: 0 };
    }

    // Batch fetch all broadcast data
    const broadcastKeys = allIds.map((id) => BROADCAST_KEY(id));
    const broadcastValues = await this.redis.mget(...broadcastKeys);

    // Filter out expired (null) broadcasts
    const validBroadcasts: BroadcastDto[] = [];
    for (const raw of broadcastValues) {
      if (raw) {
        validBroadcasts.push(JSON.parse(raw));
      }
    }

    // Sort by createdAt descending
    validBroadcasts.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Paginate
    const start = (page - 1) * limit;
    const broadcasts = validBroadcasts.slice(start, start + limit);

    return { broadcasts, total: validBroadcasts.length };
  }
}
