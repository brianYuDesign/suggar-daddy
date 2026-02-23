import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MESSAGING_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { TextFilterService } from '@suggar-daddy/moderation';
import { ConversationEntity, MessageEntity } from '@suggar-daddy/entities';
import type {
  MessageDto,
  ConversationDto,
  MessageAttachmentDto,
  BroadcastDto,
} from '@suggar-daddy/dto';
import { SubscriptionServiceClient } from './subscription-service.client';
import { GateException } from './gate-error.types';
import type { GateErrorResponse } from './gate-error.types';
import { CircuitBreaker } from './circuit-breaker';

/** [N-006] 頻率限制 Redis key */
const RATE_LIMIT_KEY = (userId: string) => `rate:msg:${userId}`;
/** [N-006] 每分鐘最大訊息數 */
const RATE_LIMIT_MAX = 60;
/** [N-006] 頻率限制窗口（秒） */
const RATE_LIMIT_WINDOW = 60;

const CONV_KEY = (id: string) => `conversation:${id}`;
const USER_CONVS = (userId: string) => `user:${userId}:conversations`;
const CONV_MESSAGES = (convId: string) => `conversation:${convId}:messages`;
const MSG_KEY = (id: string) => `msg:${id}`;
const USER_KEY = (id: string) => `user:${id}`;
const USER_BLOCKS = (userId: string) => `user:blocks:${userId}`;
const DM_UNLOCK_KEY = (senderId: string, creatorId: string) =>
  `dm:unlock:${senderId}:${creatorId}`;
const CHAT_DIAMOND_UNLOCK = (senderId: string, recipientId: string) =>
  `chat:diamond:unlock:${senderId}:${recipientId}`;
const READ_RECEIPT_KEY = (convId: string, userId: string) =>
  `read:receipt:${convId}:${userId}`;
const BROADCAST_KEY = (id: string) => `broadcast:${id}`;
const USER_BROADCASTS = (userId: string) => `user:${userId}:broadcasts`;
const USER_FOLLOWERS = (userId: string) => `user:followers:${userId}`;
const DIAMOND_KEY = (userId: string) => `diamond:${userId}`;

/**
 * [N-003] Lua 腳本：原子扣除鑽石
 *
 * KEYS[1] = diamond:{userId}
 * ARGV[1] = cost (number)
 * ARGV[2] = updatedAt (ISO string)
 *
 * 回傳值：
 *  >= 0  : 扣除成功，回傳新餘額
 *  -1    : key 不存在（使用者無鑽石帳戶）
 *  -2    : 餘額不足
 */
const DIAMOND_DEDUCT_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local data = cjson.decode(raw)
local cost = tonumber(ARGV[1])
if data.balance < cost then return -2 end
data.balance = data.balance - cost
data.totalSpent = (data.totalSpent or 0) + cost
data.updatedAt = ARGV[2]
redis.call('SET', KEYS[1], cjson.encode(data))
return data.balance
`;

/**
 * [N-003] Lua 腳本：原子增加鑽石（收款方）
 *
 * KEYS[1] = diamond:{userId}
 * ARGV[1] = amount (number)
 * ARGV[2] = updatedAt (ISO string)
 *
 * 回傳值：
 *  >= 0  : 增加成功，回傳新餘額
 *  -1    : key 不存在（收款方無鑽石帳戶，跳過）
 */
const DIAMOND_CREDIT_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local data = cjson.decode(raw)
local amount = tonumber(ARGV[1])
data.balance = data.balance + amount
data.totalReceived = (data.totalReceived or 0) + amount
data.updatedAt = ARGV[2]
redis.call('SET', KEYS[1], cjson.encode(data))
return data.balance
`;

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

  /** [N-001] Redis 斷路器 — 讀取操作 */
  private readonly readBreaker = new CircuitBreaker({
    name: 'redis-read',
    failureThreshold: 5,
    failureWindow: 30_000,
    resetTimeout: 10_000,
  });

  /** [N-001] Redis 斷路器 — 寫入操作 */
  private readonly writeBreaker = new CircuitBreaker({
    name: 'redis-write',
    failureThreshold: 5,
    failureWindow: 30_000,
    resetTimeout: 10_000,
  });

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly subscriptionClient: SubscriptionServiceClient,
    private readonly textFilter: TextFilterService,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
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
      try {
        await this.kafkaProducer.sendEvent(
          MESSAGING_EVENTS.CONVERSATION_CREATED,
          {
            conversationId: id,
            participantAId: userAId,
            participantBId: userBId,
            createdAt: new Date().toISOString(),
          },
        );
      } catch (e) {
        this.logger.warn('Kafka conversation.created emit failed', e);
      }
    }
    return id;
  }

  async send(
    senderId: string,
    conversationId: string,
    content: string,
    attachments?: MessageAttachmentDto[],
  ): Promise<MessageDto> {
    // [N-006] 頻率限制：每使用者每分鐘最多 60 則訊息
    await this.checkRateLimit(senderId);

    const convRaw = await this.readBreaker.execute(
      () => this.redis.get(CONV_KEY(conversationId)),
    );
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
            throw new GateException({
              code: 'DM_DIAMOND_GATE',
              message: `此創作者需要 ${recipient.dmPrice} 鑽石解鎖私訊功能`,
              diamondCost: recipient.dmPrice,
              metadata: { recipientId },
            });
          }
        }
      }

      // Diamond chat gate: if recipient has chatDiamondGateEnabled, check message count
      if (
        recipient.chatDiamondGateEnabled &&
        recipient.chatDiamondThreshold > 0
      ) {
        // Check if already unlocked
        const isUnlocked = await this.redis.exists(
          CHAT_DIAMOND_UNLOCK(senderId, recipientId),
        );

        if (!isUnlocked) {
          // Count sender's messages in this conversation
          const msgIds = await this.redis.lRange(
            CONV_MESSAGES(conversationId),
            0,
            -1,
          );
          const msgKeys = msgIds.map((id) => MSG_KEY(id));
          let senderMsgCount = 0;

          if (msgKeys.length > 0) {
            const msgValues = await this.redis.mget(...msgKeys);
            for (const raw of msgValues) {
              if (raw) {
                const m = JSON.parse(raw) as StoredMessage;
                if (m.senderId === senderId) senderMsgCount++;
              }
            }
          }

          if (senderMsgCount >= recipient.chatDiamondThreshold) {
            throw new GateException({
              code: 'CHAT_DIAMOND_GATE',
              message: `已達免費訊息上限 (${recipient.chatDiamondThreshold} 則)，需使用鑽石解鎖繼續聊天`,
              diamondCost: recipient.chatDiamondCost || 10,
              metadata: {
                threshold: recipient.chatDiamondThreshold,
                sentCount: senderMsgCount,
              },
            });
          }
        }
      }
    }

    // Synchronous text moderation: block HIGH severity, flag MEDIUM
    if (content) {
      const filterResult = this.textFilter.check(content);
      if (filterResult.severity === 'high') {
        this.logger.warn(
          `message blocked by moderation senderId=${senderId} severity=high flagged=${filterResult.flaggedWords.join(',')}`,
        );
        throw new HttpException(
          'Your message contains prohibited content and cannot be sent.',
          HttpStatus.FORBIDDEN,
        );
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

    await this.writeBreaker.execute(async () => {
      await this.redis.set(MSG_KEY(msgId), JSON.stringify(stored));
      await this.redis.lPush(CONV_MESSAGES(conversationId), msgId);
    });
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
    const convIds = await this.readBreaker.execute(
      () => this.redis.sMembers(USER_CONVS(userId)),
      [] as string[],
    );
    // [F-001] Redis 回退：如果 Redis 無資料（可能被驅逐），從 PostgreSQL 讀取
    if (convIds.length === 0) {
      const dbResult = await this.getConversationsFromDB(userId);
      if (dbResult.length > 0) {
        this.logger.log(`PostgreSQL fallback: found ${dbResult.length} conversations for userId=${userId}`);
        return dbResult;
      }
      return [];
    }
    // Batch fetch all conversations
    const convKeys = convIds.map((id) => CONV_KEY(id));
    const convValues = await this.readBreaker.execute(
      () => this.redis.mget(...convKeys),
      convKeys.map(() => null),
    );

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

    // Batch fetch read receipts for the user
    const receiptKeys = filteredConvs.map(({ convId }) =>
      READ_RECEIPT_KEY(convId, userId),
    );
    const receiptValues = receiptKeys.length
      ? await this.redis.mget(...receiptKeys)
      : [];

    const result: ConversationDto[] = filteredConvs.map(({ conv }, i) => {
      let unreadCount = 0;
      const lastMsgId = lastMsgIds[i]?.[0];
      if (lastMsgId && receiptValues[i]) {
        const receipt = JSON.parse(receiptValues[i]!) as { messageId: string };
        if (receipt.messageId !== lastMsgId) {
          unreadCount = 1; // simplified: at least 1 unread
        }
      } else if (lastMsgId && !receiptValues[i]) {
        // Never read → check if the last message is from someone else
        const lastMsgData = msgValues[msgIndexMap.indexOf(i)];
        if (lastMsgData) {
          const m = JSON.parse(lastMsgData) as StoredMessage;
          if (m.senderId !== userId) unreadCount = 1;
        }
      }
      return {
        id: conv.id,
        participantIds: conv.participantIds,
        lastMessageAt: lastMessageAtMap.get(i),
        unreadCount,
      };
    });

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
  ): Promise<{ messages: MessageDto[]; nextCursor?: string; hasMore: boolean }> {
    const convRaw = await this.readBreaker.execute(
      () => this.redis.get(CONV_KEY(conversationId)),
      null,
    );

    // [F-001] Redis 回退：如果 Redis 無此對話，嘗試 PostgreSQL
    if (!convRaw) {
      const dbConv = await this.getConversationFromDB(conversationId);
      if (!dbConv || !dbConv.participantIds.includes(userId)) {
        return { messages: [], hasMore: false };
      }
      this.logger.log(`PostgreSQL fallback: reading messages for conversationId=${conversationId}`);
      const offset = cursor ? parseInt(cursor, 10) : 0;
      const result = await this.getMessagesFromDB(conversationId, limit, offset);
      const nextOffset = offset + result.messages.length;
      return {
        messages: result.messages,
        nextCursor: result.hasMore ? String(nextOffset) : undefined,
        hasMore: result.hasMore,
      };
    }

    const conv = JSON.parse(convRaw);
    if (!conv.participantIds?.includes(userId))
      return { messages: [], hasMore: false };

    // Redis list: index 0 = newest (lPush). Use offset-based pagination.
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const totalLen = await this.redis.lLen(CONV_MESSAGES(conversationId));

    // [F-001] 如果 Redis 列表為空但對話存在，嘗試 PostgreSQL
    if (totalLen === 0 || offset >= totalLen) {
      if (totalLen === 0) {
        const dbResult = await this.getMessagesFromDB(conversationId, limit, offset);
        if (dbResult.messages.length > 0) {
          this.logger.log(`PostgreSQL fallback: found ${dbResult.messages.length} messages`);
          const nextOffset = offset + dbResult.messages.length;
          return {
            messages: dbResult.messages,
            nextCursor: dbResult.hasMore ? String(nextOffset) : undefined,
            hasMore: dbResult.hasMore,
          };
        }
      }
      return { messages: [], hasMore: false };
    }

    const end = Math.min(offset + limit - 1, totalLen - 1);
    const msgIds = await this.redis.lRange(
      CONV_MESSAGES(conversationId),
      offset,
      end,
    );

    if (msgIds.length === 0) {
      return { messages: [], hasMore: false };
    }

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

    const nextOffset = offset + msgIds.length;
    const hasMore = nextOffset < totalLen;
    const nextCursor = hasMore ? String(nextOffset) : undefined;

    return { messages, nextCursor, hasMore };
  }

  /** 檢查聊天狀態：是否需要鑽石解鎖 */
  async getChatStatus(
    userId: string,
    conversationId: string,
  ): Promise<{
    canSend: boolean;
    gate?: { type: 'DM_DIAMOND_GATE' | 'CHAT_DIAMOND_GATE'; diamondCost: number; message: string; threshold?: number; sentCount?: number };
  }> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) return { canSend: true };
    const conv = JSON.parse(convRaw) as { id: string; participantIds: string[] };

    const recipientId = conv.participantIds.find((p) => p !== userId);
    if (!recipientId) return { canSend: true };

    const recipientRaw = await this.redis.get(USER_KEY(recipientId));
    if (!recipientRaw) return { canSend: true };
    const recipient = JSON.parse(recipientRaw);

    // Check DM price gate
    if (recipient.dmPrice && recipient.dmPrice > 0) {
      const hasSubscription = await this.subscriptionClient.hasActiveSubscription(userId, recipientId);
      if (!hasSubscription) {
        const hasDmAccess = await this.redis.exists(DM_UNLOCK_KEY(userId, recipientId));
        if (!hasDmAccess) {
          return {
            canSend: false,
            gate: {
              type: 'DM_DIAMOND_GATE',
              diamondCost: Math.ceil(recipient.dmPrice),
              message: `此創作者需要 ${Math.ceil(recipient.dmPrice)} 鑽石解鎖私訊功能`,
            },
          };
        }
      }
    }

    // Check chat diamond gate
    if (recipient.chatDiamondGateEnabled && recipient.chatDiamondThreshold > 0) {
      const isUnlocked = await this.redis.exists(CHAT_DIAMOND_UNLOCK(userId, recipientId));
      if (!isUnlocked) {
        const msgIds = await this.redis.lRange(CONV_MESSAGES(conversationId), 0, -1);
        let senderMsgCount = 0;
        if (msgIds.length > 0) {
          const msgKeys = msgIds.map((id) => MSG_KEY(id));
          const msgValues = await this.redis.mget(...msgKeys);
          for (const raw of msgValues) {
            if (raw) {
              const m = JSON.parse(raw) as StoredMessage;
              if (m.senderId === userId) senderMsgCount++;
            }
          }
        }
        if (senderMsgCount >= recipient.chatDiamondThreshold) {
          return {
            canSend: false,
            gate: {
              type: 'CHAT_DIAMOND_GATE',
              diamondCost: recipient.chatDiamondCost || 10,
              message: `已達免費訊息上限 (${recipient.chatDiamondThreshold} 則)，需使用鑽石解鎖繼續聊天`,
              threshold: recipient.chatDiamondThreshold,
              sentCount: senderMsgCount,
            },
          };
        }
      }
    }

    return { canSend: true };
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

  /** Unlock diamond chat gate for a conversation */
  async unlockChatDiamondGate(
    userId: string,
    conversationId: string,
  ): Promise<{ unlocked: boolean; diamondCost: number }> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    const conv = JSON.parse(convRaw) as {
      id: string;
      participantIds: string[];
    };

    const recipientId = conv.participantIds.find((p) => p !== userId);
    if (!recipientId) {
      throw new HttpException(
        'Cannot determine recipient',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if already unlocked
    const alreadyUnlocked = await this.redis.exists(
      CHAT_DIAMOND_UNLOCK(userId, recipientId),
    );
    if (alreadyUnlocked) {
      return { unlocked: true, diamondCost: 0 };
    }

    // Get recipient's diamond cost
    const recipientRaw = await this.redis.get(USER_KEY(recipientId));
    if (!recipientRaw) {
      throw new HttpException('Recipient not found', HttpStatus.NOT_FOUND);
    }
    const recipient = JSON.parse(recipientRaw);
    const diamondCost = recipient.chatDiamondCost || 10;

    // [N-003] 原子扣除鑽石（Lua 腳本，防止 TOCTOU 競態條件）
    const now = new Date().toISOString();
    const deductResult = await this.atomicDiamondDeduct(userId, diamondCost, now);
    if (deductResult === -1) {
      throw new HttpException(
        '鑽石餘額不足，請先購買鑽石',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (deductResult === -2) {
      throw new HttpException(
        `鑽石餘額不足，需要 ${diamondCost} 顆鑽石`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 原子增加收款方鑽石
    await this.atomicDiamondCredit(recipientId, diamondCost, now);

    // Set permanent unlock key
    await this.redis.set(CHAT_DIAMOND_UNLOCK(userId, recipientId), '1');

    // Emit Kafka event
    try {
      await this.kafkaProducer.sendEvent('chat.diamond.unlocked', {
        userId,
        recipientId,
        conversationId,
        diamondCost,
        unlockedAt: now,
      });
    } catch (e) {
      this.logger.warn('Kafka chat.diamond.unlocked emit failed', e);
    }

    this.logger.log(
      `chat diamond gate unlocked userId=${userId} recipientId=${recipientId} cost=${diamondCost}`,
    );

    return { unlocked: true, diamondCost };
  }

  /** Unlock DM access using diamonds (dmPrice gate) */
  async unlockDmAccess(
    userId: string,
    conversationId: string,
  ): Promise<{ unlocked: boolean; diamondCost: number }> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }
    const conv = JSON.parse(convRaw) as {
      id: string;
      participantIds: string[];
    };

    const recipientId = conv.participantIds.find((p) => p !== userId);
    if (!recipientId) {
      throw new HttpException(
        'Cannot determine recipient',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if already unlocked
    const alreadyUnlocked = await this.redis.exists(
      DM_UNLOCK_KEY(userId, recipientId),
    );
    if (alreadyUnlocked) {
      return { unlocked: true, diamondCost: 0 };
    }

    // Get recipient's DM price
    const recipientRaw = await this.redis.get(USER_KEY(recipientId));
    if (!recipientRaw) {
      throw new HttpException('Recipient not found', HttpStatus.NOT_FOUND);
    }
    const recipient = JSON.parse(recipientRaw);
    const diamondCost = Math.ceil(recipient.dmPrice || 50);

    // [N-003] 原子扣除鑽石（Lua 腳本，防止 TOCTOU 競態條件）
    const now = new Date().toISOString();
    const deductResult = await this.atomicDiamondDeduct(userId, diamondCost, now);
    if (deductResult === -1) {
      throw new HttpException(
        '鑽石餘額不足，請先購買鑽石',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    if (deductResult === -2) {
      throw new HttpException(
        `鑽石餘額不足，需要 ${diamondCost} 顆鑽石`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // 原子增加收款方鑽石
    await this.atomicDiamondCredit(recipientId, diamondCost, now);

    // Set permanent DM unlock key
    await this.redis.set(DM_UNLOCK_KEY(userId, recipientId), '1');

    // Emit Kafka event
    try {
      await this.kafkaProducer.sendEvent('dm.diamond.unlocked', {
        userId,
        recipientId,
        conversationId,
        diamondCost,
        unlockedAt: now,
      });
    } catch (e) {
      this.logger.warn('Kafka dm.diamond.unlocked emit failed', e);
    }

    this.logger.log(
      `DM access unlocked userId=${userId} recipientId=${recipientId} cost=${diamondCost}`,
    );

    return { unlocked: true, diamondCost };
  }

  // ── Read Receipts ──────────────────────────────────────────

  async markAsRead(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    const receipt = { messageId, readAt: new Date().toISOString() };
    await this.redis.set(
      READ_RECEIPT_KEY(conversationId, userId),
      JSON.stringify(receipt),
    );
    try {
      await this.kafkaProducer.sendEvent(MESSAGING_EVENTS.MESSAGE_READ, {
        conversationId,
        userId,
        messageId,
        readAt: receipt.readAt,
      });
    } catch (e) {
      this.logger.warn('Kafka message.read emit failed', e);
    }
    this.logger.log(
      `markAsRead userId=${userId} conversationId=${conversationId} messageId=${messageId}`,
    );
  }

  async getReadReceipt(
    conversationId: string,
    userId: string,
  ): Promise<{ messageId: string; readAt: string } | null> {
    const raw = await this.redis.get(
      READ_RECEIPT_KEY(conversationId, userId),
    );
    return raw ? JSON.parse(raw) : null;
  }

  async getReadReceipts(
    conversationId: string,
  ): Promise<Record<string, { messageId: string; readAt: string }>> {
    const convRaw = await this.redis.get(CONV_KEY(conversationId));
    if (!convRaw) return {};
    const conv = JSON.parse(convRaw) as { participantIds: string[] };
    const results: Record<string, { messageId: string; readAt: string }> = {};
    const receipts = await Promise.all(
      conv.participantIds.map((uid) =>
        this.redis.get(READ_RECEIPT_KEY(conversationId, uid)),
      ),
    );
    conv.participantIds.forEach((uid, i) => {
      if (receipts[i]) {
        results[uid] = JSON.parse(receipts[i]!);
      }
    });
    return results;
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

  // ── [N-003] 原子鑽石操作 ─────────────────────────────────

  /**
   * 原子扣除鑽石（Lua 腳本）
   *
   * @returns >= 0: 扣除成功（新餘額）, -1: 帳戶不存在, -2: 餘額不足
   */
  private async atomicDiamondDeduct(
    userId: string,
    cost: number,
    updatedAt: string,
  ): Promise<number> {
    const client = this.redis.getClient();
    const result = await client.eval(
      DIAMOND_DEDUCT_LUA,
      1,
      DIAMOND_KEY(userId),
      cost.toString(),
      updatedAt,
    );
    return Number(result);
  }

  /**
   * 原子增加鑽石（Lua 腳本）
   *
   * @returns >= 0: 增加成功（新餘額）, -1: 帳戶不存在（跳過）
   */
  private async atomicDiamondCredit(
    userId: string,
    amount: number,
    updatedAt: string,
  ): Promise<number> {
    const client = this.redis.getClient();
    const result = await client.eval(
      DIAMOND_CREDIT_LUA,
      1,
      DIAMOND_KEY(userId),
      amount.toString(),
      updatedAt,
    );
    return Number(result);
  }

  // ── [N-006] 頻率限制 ────────────────────────────────────

  /**
   * 滑動窗口頻率限制：每使用者每分鐘最多 RATE_LIMIT_MAX 則訊息
   *
   * 使用 Redis INCR + EXPIRE 實現簡易計數器窗口。
   * 在窗口期內超過上限時拋出 429 Too Many Requests。
   */
  private async checkRateLimit(userId: string): Promise<void> {
    try {
      const key = RATE_LIMIT_KEY(userId);
      const count = await this.redis.incr(key);

      // 第一次寫入時設定過期時間
      if (count === 1) {
        await this.redis.expire(key, RATE_LIMIT_WINDOW);
      }

      if (count > RATE_LIMIT_MAX) {
        throw new HttpException(
          '訊息發送過於頻繁，請稍後再試',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      // 若是頻率限制例外，直接拋出
      if (error instanceof HttpException) throw error;
      // Redis 故障時不阻擋發送（fail-open）
      this.logger.warn('Rate limit check failed (fail-open)', error);
    }
  }

  // ── [N-001] 斷路器狀態 ──────────────────────────────────

  /** 取得斷路器狀態（用於健康檢查） */
  getCircuitBreakerStates() {
    return {
      read: this.readBreaker.getState(),
      write: this.writeBreaker.getState(),
    };
  }

  // ── [F-001/W-001] PostgreSQL 回退讀取 ──────────────────

  /**
   * 從 PostgreSQL 讀取使用者的對話列表（Redis 回退）
   *
   * 當 Redis 不可用或 key 不存在時，從 PostgreSQL 讀取。
   * 查詢 conversations 表中 participantAId 或 participantBId 匹配的對話。
   */
  private async getConversationsFromDB(userId: string): Promise<ConversationDto[]> {
    try {
      const conversations = await this.conversationRepo
        .createQueryBuilder('c')
        .where('c.participantAId = :userId OR c.participantBId = :userId', { userId })
        .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
        .getMany();

      return conversations.map((c) => ({
        id: c.id,
        participantIds: [c.participantAId, c.participantBId],
        lastMessageAt: c.lastMessageAt ?? undefined,
        unreadCount: 0, // 從 DB 讀取時無法精確計算未讀數
      }));
    } catch (error) {
      this.logger.error('PostgreSQL fallback getConversations failed', error);
      return [];
    }
  }

  /**
   * 從 PostgreSQL 讀取對話訊息（Redis 回退）
   *
   * 使用 idx_message_conversation_created 複合索引進行高效查詢。
   * 支援 offset-based 分頁。
   */
  private async getMessagesFromDB(
    conversationId: string,
    limit: number,
    offset: number,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    try {
      const [entities, total] = await this.messageRepo.findAndCount({
        where: { conversationId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });

      const messages: MessageDto[] = entities.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        attachments: (m.attachments as MessageAttachmentDto[] | undefined) ?? undefined,
        createdAt: m.createdAt,
      }));

      return { messages, hasMore: offset + limit < total };
    } catch (error) {
      this.logger.error('PostgreSQL fallback getMessages failed', error);
      return { messages: [], hasMore: false };
    }
  }

  /**
   * 從 PostgreSQL 查找對話（Redis 回退）
   */
  private async getConversationFromDB(
    conversationId: string,
  ): Promise<{ id: string; participantIds: string[] } | null> {
    try {
      const conv = await this.conversationRepo.findOne({
        where: { id: conversationId },
      });
      if (!conv) return null;
      return { id: conv.id, participantIds: [conv.participantAId, conv.participantBId] };
    } catch (error) {
      this.logger.error('PostgreSQL fallback getConversation failed', error);
      return null;
    }
  }
}
