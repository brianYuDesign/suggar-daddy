import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * 分片鍵策略（與 BACKEND_DESIGN 對齊）
 * - users / swipes / matches: user_id
 * - messages: conversation_id
 * - subscriptions: subscriber_id
 * - posts: creator_id
 */
@Injectable()
export class ShardingService {
  private readonly shardCount: number;

  constructor(shardCount?: number) {
    const envCount = parseInt(process.env['SHARD_COUNT'] ?? '16', 10);
    this.shardCount = shardCount ?? (Number.isNaN(envCount) ? 16 : envCount);
  }

  /**
   * 依字串 key 計算穩定分片 ID（0 ~ shardCount-1）。
   * 使用 MD5 前 8 字元轉數字再取餘，分佈均勻且同一 key 永遠落在同一 shard。
   */
  getShardId(key: string): number {
    if (!key || this.shardCount <= 0) return 0;
    const hash = createHash('md5').update(key).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16);
    return Math.abs(num % this.shardCount);
  }

  /** 用戶相關資料（users, swipes, matches 等） */
  getShardIdByUserId(userId: string): number {
    return this.getShardId(userId);
  }

  /** 訊息表：依 conversation_id */
  getShardIdByConversationId(conversationId: string): number {
    return this.getShardId(conversationId);
  }

  /** 訂閱表：依 subscriber_id */
  getShardIdBySubscriberId(subscriberId: string): number {
    return this.getShardId(subscriberId);
  }

  /** 貼文表：依 creator_id */
  getShardIdByCreatorId(creatorId: string): number {
    return this.getShardId(creatorId);
  }

  getShardCount(): number {
    return this.shardCount;
  }
}
