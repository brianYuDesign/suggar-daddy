/**
 * 聊天室管理服務
 * 提供超級管理員查看所有用戶聊天室和訊息的功能
 * 聊天資料儲存於 Redis，此服務直接讀取 Redis 資料
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

interface ConversationData {
  id: string;
  participantIds: string[];
  lastMessageAt?: string;
}

interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: Array<{ id: string; type: string; url: string; thumbnailUrl?: string }>;
  createdAt: string;
}

@Injectable()
export class ChatManagementService {
  private readonly logger = new Logger(ChatManagementService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 查詢指定用戶的所有聊天室
   */
  async getUserConversations(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    const client = this.redisService.getClient();
    const conversationIds = await client.smembers(`user:${userId}:conversations`);

    if (!conversationIds || conversationIds.length === 0) {
      return { userId, displayName: user.displayName, conversations: [], total: 0 };
    }

    const conversations = await this.getConversationsDetail(conversationIds);

    return {
      userId,
      displayName: user.displayName,
      conversations,
      total: conversations.length,
    };
  }

  /**
   * 列出所有聊天室（全系統）
   * 使用 Redis SCAN 掃描所有 conversation keys
   */
  async listAllConversations(page: number, limit: number, search?: string) {
    const client = this.redisService.getClient();
    const allConvKeys: string[] = [];
    let cursor = '0';

    do {
      const result = await client.scan(cursor, 'MATCH', 'conversation:*', 'COUNT', 200);
      cursor = result[0];
      // 過濾掉 messages 子 key
      const convKeys = result[1].filter(
        (k) => !k.includes(':messages') && k.startsWith('conversation:'),
      );
      allConvKeys.push(...convKeys);
    } while (cursor !== '0');

    // 去重
    const uniqueKeys = [...new Set(allConvKeys)];
    const conversationIds = uniqueKeys.map((k) => k.replace('conversation:', ''));

    // 取得對話詳情
    let conversations = await this.getConversationsDetail(conversationIds);

    // 搜尋過濾（依參與者名稱）
    if (search) {
      const searchLower = search.toLowerCase();
      conversations = conversations.filter((conv) =>
        conv.participants?.some((p: any) =>
          p.displayName?.toLowerCase().includes(searchLower) ||
          p.email?.toLowerCase().includes(searchLower),
        ),
      );
    }

    // 排序（按最後訊息時間）
    conversations.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });

    const total = conversations.length;
    const start = (page - 1) * limit;
    const paged = conversations.slice(start, start + limit);

    return { data: paged, total, page, limit };
  }

  /**
   * 查看特定聊天室的訊息
   */
  async getConversationMessages(
    conversationId: string,
    page: number,
    limit: number,
  ) {
    const client = this.redisService.getClient();

    // 取得對話資訊
    const convData = await client.get(`conversation:${conversationId}`);
    if (!convData) {
      throw new NotFoundException('聊天室 ' + conversationId + ' 不存在');
    }

    const conversation: ConversationData = JSON.parse(convData);

    // 取得訊息 ID 列表（從新到舊排序）
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const messageIds = await client.lrange(
      `conversation:${conversationId}:messages`,
      start,
      end,
    );

    const totalMessages = await client.llen(`conversation:${conversationId}:messages`);

    // 批量取得訊息內容
    const messages: MessageData[] = [];
    if (messageIds.length > 0) {
      const pipeline = client.pipeline();
      for (const msgId of messageIds) {
        pipeline.get(`msg:${msgId}`);
      }
      const results = await pipeline.exec();
      if (results) {
        for (const [err, data] of results) {
          if (!err && data) {
            try {
              messages.push(JSON.parse(data as string));
            } catch {
              // skip malformed messages
            }
          }
        }
      }
    }

    // 取得參與者資訊
    const participants = await this.getUsersInfo(conversation.participantIds);

    // 取得訊息發送者資訊
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await this.getUsersInfo(senderIds);
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const enrichedMessages = messages.map((m) => ({
      ...m,
      sender: senderMap.get(m.senderId) || { id: m.senderId, displayName: '未知用戶' },
    }));

    return {
      conversation: {
        id: conversationId,
        participantIds: conversation.participantIds,
        participants,
      },
      messages: enrichedMessages,
      total: totalMessages,
      page,
      limit,
    };
  }

  /**
   * 取得聊天統計資料
   */
  async getChatStats() {
    const client = this.redisService.getClient();

    // 計算總聊天室數
    let totalConversations = 0;
    let cursor = '0';
    do {
      const result = await client.scan(cursor, 'MATCH', 'conversation:*', 'COUNT', 200);
      cursor = result[0];
      const convKeys = result[1].filter(
        (k) => !k.includes(':messages') && k.startsWith('conversation:'),
      );
      totalConversations += convKeys.length;
    } while (cursor !== '0');

    // 計算總訊息數
    let totalMessages = 0;
    cursor = '0';
    do {
      const result = await client.scan(cursor, 'MATCH', 'msg:*', 'COUNT', 200);
      cursor = result[0];
      totalMessages += result[1].length;
    } while (cursor !== '0');

    // 取得線上用戶數
    let onlineUsers = 0;
    cursor = '0';
    do {
      const result = await client.scan(cursor, 'MATCH', 'user:online:*', 'COUNT', 200);
      cursor = result[0];
      onlineUsers += result[1].length;
    } while (cursor !== '0');

    return {
      totalConversations,
      totalMessages,
      onlineUsers,
    };
  }

  // ---- 私有方法 ----

  /** 批量取得對話詳情 */
  private async getConversationsDetail(conversationIds: string[]) {
    if (conversationIds.length === 0) return [];

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();
    for (const id of conversationIds) {
      pipeline.get(`conversation:${id}`);
    }
    const results = await pipeline.exec();

    const conversations: any[] = [];
    const allParticipantIds = new Set<string>();

    if (results) {
      for (const [err, data] of results) {
        if (!err && data) {
          try {
            const conv: ConversationData = JSON.parse(data as string);
            conversations.push(conv);
            conv.participantIds?.forEach((id) => allParticipantIds.add(id));
          } catch {
            // skip malformed data
          }
        }
      }
    }

    // 批量取得所有參與者資訊
    const users = await this.getUsersInfo([...allParticipantIds]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return conversations.map((conv) => ({
      ...conv,
      participants: conv.participantIds?.map(
        (id: string) => userMap.get(id) || { id, displayName: '未知用戶' },
      ),
    }));
  }

  /** 批量取得用戶基本資訊 */
  private async getUsersInfo(userIds: string[]) {
    if (userIds.length === 0) return [];

    const users = await this.userRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'displayName', 'email', 'avatarUrl', 'username', 'permissionRole'],
    });

    return users.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl,
      username: u.username,
      permissionRole: u.permissionRole,
    }));
  }
}
