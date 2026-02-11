import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MATCHING_EVENTS } from '@suggar-daddy/common';
import type {
  UserCardDto,
  MatchDto,
  SwipeResponseDto,
  SwipeAction,
  CardsResponseDto,
  MatchesResponseDto,
} from '@suggar-daddy/dto';
import { UserServiceClient } from './user-service.client';

// 架構：讀取 Redis，寫入 Kafka；推薦卡片由 user-service 提供。
interface SwipeRecord {
  swiperId: string;
  swipedId: string;
  action: SwipeAction;
  createdAt: Date;
}

interface MatchRecord {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
  status: 'active' | 'unmatched' | 'blocked';
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly SWIPE_PREFIX = 'swipe:';
  private readonly MATCH_PREFIX = 'match:';
  private readonly USER_SWIPES_PREFIX = 'user_swipes:';
  private readonly USER_MATCHES_PREFIX = 'user_matches:';

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly userServiceClient: UserServiceClient,
  ) {}

  async swipe(
    swiperId: string,
    targetUserId: string,
    action: SwipeAction
  ): Promise<SwipeResponseDto> {
    // 檢查是否已經 swipe 過
    const swipeKey = `${this.SWIPE_PREFIX}${swiperId}:${targetUserId}`;
    const existing = await this.redisService.get(swipeKey);
    
    if (!existing) {
      // 儲存 swipe 記錄到 Redis
      const swipeRecord: SwipeRecord = {
        swiperId,
        swipedId: targetUserId,
        action,
        createdAt: new Date(),
      };
      await this.redisService.set(swipeKey, JSON.stringify(swipeRecord));
      
      // 將 swipe 加入用戶的 swipes 列表
      const userSwipesKey = `${this.USER_SWIPES_PREFIX}${swiperId}`;
      await this.redisService.sAdd(userSwipesKey, targetUserId);
      
      this.logger.log(`swipe recorded swiperId=${swiperId} targetUserId=${targetUserId} action=${action}`);
    }

    // 檢查是否雙向喜歡
    if (action === 'like' || action === 'super_like') {
      const reverseSwipeKey = `${this.SWIPE_PREFIX}${targetUserId}:${swiperId}`;
      const reverseSwipe = await this.redisService.get(reverseSwipeKey);
      
      if (reverseSwipe) {
        const reverseRecord: SwipeRecord = JSON.parse(reverseSwipe);
        const mutualLike = reverseRecord.action === 'like' || reverseRecord.action === 'super_like';
        
        if (mutualLike) {
          // 檢查是否已經有配對
          const matchKey1 = `${this.MATCH_PREFIX}${swiperId}:${targetUserId}`;
          const matchKey2 = `${this.MATCH_PREFIX}${targetUserId}:${swiperId}`;
          const existingMatch1 = await this.redisService.get(matchKey1);
          const existingMatch2 = await this.redisService.get(matchKey2);
          
          if (!existingMatch1 && !existingMatch2) {
            // 創建新配對
            const match: MatchRecord = {
              id: `match-${Date.now()}`,
              userAId: swiperId,
              userBId: targetUserId,
              matchedAt: new Date(),
              status: 'active',
            };
            
            // 儲存配對到 Redis
            await this.redisService.set(matchKey1, JSON.stringify(match));
            
            // 將配對加入兩個用戶的 matches 列表
            await this.redisService.sAdd(`${this.USER_MATCHES_PREFIX}${swiperId}`, match.id);
            await this.redisService.sAdd(`${this.USER_MATCHES_PREFIX}${targetUserId}`, match.id);
            
            this.logger.log(`match created matchId=${match.id} userA=${swiperId} userB=${targetUserId}`);
            
            // 發送 Kafka 事件
            await this.kafkaProducer.sendEvent(MATCHING_EVENTS.MATCHED, {
              matchId: match.id,
              userAId: swiperId,
              userBId: targetUserId,
              matchedAt: match.matchedAt.toISOString(),
            });
            
            return { matched: true, matchId: match.id };
          }
          
          const existingMatchRecord: MatchRecord = JSON.parse(existingMatch1 || existingMatch2);
          this.logger.log(`mutual like (existing match) matchId=${existingMatchRecord.id} swiperId=${swiperId} targetUserId=${targetUserId}`);
          return { matched: true, matchId: existingMatchRecord.id };
        }
      }
    }
    return { matched: false };
  }

  async getCards(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<CardsResponseDto> {
    const userSwipesKey = `${this.USER_SWIPES_PREFIX}${userId}`;
    const swipedIdsArray = await this.redisService.sMembers(userSwipesKey);
    const excludeIds = [userId, ...swipedIdsArray];
    const requestLimit = Math.max(limit * 2, 50);
    let available: UserCardDto[];
    try {
      available = await this.userServiceClient.getCardsForRecommendation(
        excludeIds,
        requestLimit
      );
    } catch (err) {
      this.logger.warn('user-service getCards failed, returning empty', err);
      return { cards: [], nextCursor: undefined };
    }
    available = available.filter((c) => c.id !== userId && !excludeIds.includes(c.id));

    let start = 0;
    if (cursor) {
      const idx = available.findIndex((c) => c.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = available.slice(start, start + limit);
    const nextCursor =
      start + limit < available.length ? slice[slice.length - 1]?.id : undefined;

    return {
      cards: slice,
      nextCursor,
    };
  }

  async getMatches(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<MatchesResponseDto> {
    // 從 Redis 取得用戶的配對 ID 列表
    const userMatchesKey = `${this.USER_MATCHES_PREFIX}${userId}`;
    const matchIds = await this.redisService.sMembers(userMatchesKey);

    if (matchIds.length === 0) {
      return { matches: [], nextCursor: undefined };
    }

    // 使用 SCAN 一次取得所有 match keys，再用 MGET 批次讀取
    const allMatchKeys = await this.redisService.scan(`${this.MATCH_PREFIX}*`);
    const values = allMatchKeys.length > 0
      ? await this.redisService.mget(...allMatchKeys)
      : [];

    // 建立 matchId → MatchRecord 的 lookup map
    const matchMap = new Map<string, MatchRecord>();
    for (let i = 0; i < allMatchKeys.length; i++) {
      const raw = values[i];
      if (raw) {
        const match: MatchRecord = JSON.parse(raw);
        matchMap.set(match.id, match);
      }
    }

    // 直接 lookup 而非巢狀迴圈
    const userMatches: MatchRecord[] = [];
    for (const matchId of matchIds) {
      const match = matchMap.get(matchId);
      if (match && match.status === 'active') {
        userMatches.push({ ...match, matchedAt: new Date(match.matchedAt) });
      }
    }

    let start = 0;
    if (cursor) {
      const idx = userMatches.findIndex((m) => m.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = userMatches.slice(start, start + limit);
    const nextCursor =
      start + limit < userMatches.length
        ? slice[slice.length - 1]?.id
        : undefined;

    const matches: MatchDto[] = slice.map((m) => ({
      id: m.id,
      userAId: m.userAId,
      userBId: m.userBId,
      matchedAt: m.matchedAt,
      status: m.status,
    }));

    return {
      matches,
      nextCursor,
    };
  }

  async unmatch(userId: string, matchId: string): Promise<{ success: boolean }> {
    // 使用 SCAN 替代 KEYS
    const keys = await this.redisService.scan(`${this.MATCH_PREFIX}*`);
    const values = keys.length > 0 ? await this.redisService.mget(...keys) : [];

    for (let i = 0; i < keys.length; i++) {
      const raw = values[i];
      if (!raw) continue;
      const match: MatchRecord = JSON.parse(raw);
      if (
        match.id === matchId &&
        (match.userAId === userId || match.userBId === userId) &&
        match.status === 'active'
      ) {
        match.status = 'unmatched';
        await this.redisService.set(keys[i], JSON.stringify(match));

        await this.redisService.sRem(`${this.USER_MATCHES_PREFIX}${match.userAId}`, matchId);
        await this.redisService.sRem(`${this.USER_MATCHES_PREFIX}${match.userBId}`, matchId);

        this.logger.log(`unmatch applied userId=${userId} matchId=${matchId}`);
        return { success: true };
      }
    }
    this.logger.warn(`unmatch failed (not found or not owner) userId=${userId} matchId=${matchId}`);
    return { success: false };
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'matching-service' };
  }
}
