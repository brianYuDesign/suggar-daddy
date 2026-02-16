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
  
  // ✅ Swipe 限制設定
  private readonly DAILY_SWIPE_LIMIT = 100; // 每日 swipe 限制
  private readonly SWIPE_COUNTER_PREFIX = 'swipe_counter:';
  private readonly SWIPE_COUNTER_TTL = 86400; // 24 小時

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
    // ✅ 檢查每日 swipe 限制
    const today = new Date().toISOString().split('T')[0];
    const counterKey = `${this.SWIPE_COUNTER_PREFIX}${swiperId}:${today}`;
    
    const currentCount = await this.redisService.get(counterKey);
    const swipeCount = currentCount ? parseInt(currentCount, 10) : 0;
    
    if (swipeCount >= this.DAILY_SWIPE_LIMIT) {
      this.logger.warn(`Daily swipe limit reached for user ${swiperId}`);
      throw new Error(
        `Daily swipe limit reached (${this.DAILY_SWIPE_LIMIT}). Try again tomorrow!`
      );
    }
    
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
      
      // ✅ 增加每日 swipe 計數器
      const newCount = await this.redisService.incr(counterKey);
      if (newCount === 1) {
        // 第一次 swipe，設置過期時間為今天結束
        await this.redisService.expire(counterKey, this.SWIPE_COUNTER_TTL);
      }
      
      this.logger.log(`swipe recorded swiperId=${swiperId} targetUserId=${targetUserId} action=${action} dailyCount=${newCount}`);
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

  private readonly GEO_KEY = 'geo:users';
  private readonly DEFAULT_RADIUS_KM = 50;
  private readonly MAX_RADIUS_KM = 500;

  async getCards(
    userId: string,
    limit: number,
    cursor?: string,
    radiusKm?: number,
  ): Promise<CardsResponseDto> {
    const radius = Math.min(
      Math.max(radiusKm ?? this.DEFAULT_RADIUS_KM, 1),
      this.MAX_RADIUS_KM,
    );

    // 取得當前用戶座標
    const userPos = await this.redisService.geoPos(this.GEO_KEY, userId);

    // ✅ 優化: 限制載入的 swipes 數量，避免記憶體問題
    // 只取最近的 swipes（最多 1000 個）
    const userSwipesKey = `${this.USER_SWIPES_PREFIX}${userId}`;
    const swipedIdsArray = await this.redisService.sMembers(userSwipesKey);
    
    // 如果 swipes 太多，只取子集（這是臨時方案，長期應使用 ZSET）
    const limitedSwipedIds = swipedIdsArray.length > 1000 
      ? swipedIdsArray.slice(0, 1000) 
      : swipedIdsArray;
    
    const [blockedIds, blockedByIds] = await Promise.all([
      this.redisService.sMembers(`user:blocks:${userId}`),
      this.redisService.sMembers(`user:blocked-by:${userId}`),
    ]);
    const excludeSet = new Set([userId, ...limitedSwipedIds, ...blockedIds, ...blockedByIds]);

    // 如果用戶有座標，使用 GEO 篩選
    if (userPos) {
      return this.getCardsByGeo(userId, userPos, radius, limit, excludeSet, cursor);
    }

    // 用戶無座標時 fallback 到原有邏輯
    return this.getCardsFallback(userId, limit, excludeSet, cursor);
  }

  /** GEO-based 卡片推薦 */
  private async getCardsByGeo(
    userId: string,
    userPos: { longitude: number; latitude: number },
    radiusKm: number,
    limit: number,
    excludeSet: Set<string>,
    cursor?: string,
  ): Promise<CardsResponseDto> {
    const buffer = Math.max(limit * 3, 100);
    let nearbyUsers: Array<{ member: string; distance: number }>;
    try {
      nearbyUsers = await this.redisService.geoSearch(
        this.GEO_KEY,
        userPos.longitude,
        userPos.latitude,
        radiusKm,
        buffer,
      );
    } catch (err) {
      this.logger.warn('Redis GEOSEARCH failed, falling back', err);
      return this.getCardsFallback(userId, limit, excludeSet, cursor);
    }

    // 過濾掉自己和已滑過的
    const filtered = nearbyUsers.filter((u) => !excludeSet.has(u.member));
    if (filtered.length === 0) {
      return { cards: [], nextCursor: undefined };
    }

    // 取得卡片資訊
    const candidateIds = filtered.map((u) => u.member);
    let cards: UserCardDto[];
    try {
      cards = await this.userServiceClient.getCardsByIds(candidateIds);
    } catch (err) {
      this.logger.warn('user-service getCardsByIds failed, returning empty', err);
      return { cards: [], nextCursor: undefined };
    }

    // 建立距離 map 並附加 distance 到每張卡片
    const distMap = new Map(filtered.map((u) => [u.member, u.distance]));
    cards = cards
      .map((card) => ({
        ...card,
        distance: distMap.get(card.id) ?? undefined,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

    // 分頁
    let start = 0;
    if (cursor) {
      const idx = cards.findIndex((c) => c.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = cards.slice(start, start + limit);
    const nextCursor =
      start + limit < cards.length ? slice[slice.length - 1]?.id : undefined;

    return { cards: slice, nextCursor };
  }

  /** 無座標時 fallback：原有邏輯 */
  private async getCardsFallback(
    userId: string,
    limit: number,
    excludeSet: Set<string>,
    cursor?: string,
  ): Promise<CardsResponseDto> {
    const requestLimit = Math.max(limit * 2, 50);
    let available: UserCardDto[];
    try {
      available = await this.userServiceClient.getCardsForRecommendation(
        Array.from(excludeSet),
        requestLimit,
      );
    } catch (err) {
      this.logger.warn('user-service getCards failed, returning empty', err);
      return { cards: [], nextCursor: undefined };
    }
    available = available.filter((c) => !excludeSet.has(c.id));

    let start = 0;
    if (cursor) {
      const idx = available.findIndex((c) => c.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = available.slice(start, start + limit);
    const nextCursor =
      start + limit < available.length ? slice[slice.length - 1]?.id : undefined;

    return { cards: slice, nextCursor };
  }

  async getMatches(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<MatchesResponseDto> {
    // ✅ 優化：直接從用戶索引取得配對 ID，避免全表掃描
    const userMatchesKey = `${this.USER_MATCHES_PREFIX}${userId}`;
    const matchIds = await this.redisService.sMembers(userMatchesKey);

    if (matchIds.length === 0) {
      return { matches: [], nextCursor: undefined };
    }

    // ✅ 優化：只取需要的 match keys，使用 MGET 批量讀取
    // 不再使用 SCAN 全表掃描
    const matchKeys = matchIds.map(id => {
      // 支援兩種格式：match:id 或 match:userA:userB
      if (id.includes(':')) {
        return `${this.MATCH_PREFIX}${id}`;
      }
      // 檢查兩個可能的 key
      return id;
    });

    // 批量取得所有配對記錄
    const values = await this.redisService.mget(...matchKeys);

    // 解析配對記錄
    const userMatches: MatchRecord[] = [];
    for (let i = 0; i < values.length; i++) {
      const raw = values[i];
      if (raw) {
        try {
          const match: MatchRecord = JSON.parse(raw);
          if (match.status === 'active') {
            userMatches.push({ ...match, matchedAt: new Date(match.matchedAt) });
          }
        } catch (_err) {
          this.logger.warn(`Failed to parse match record for key ${matchKeys[i]}`);
        }
      }
    }

    // 按時間排序（最新的在前）
    userMatches.sort((a, b) => 
      new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
    );

    // 游標分頁
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

    this.logger.debug(`getMatches userId=${userId} total=${userMatches.length} returned=${matches.length}`);

    return {
      matches,
      nextCursor,
    };
  }

  private async findMatchByWildcard(
    pattern: string,
    matchId: string,
  ): Promise<{ record: MatchRecord; key: string } | null> {
    const keys = await this.redisService.scan(pattern);
    if (keys.length === 0) return null;
    const values = await this.redisService.mget(...keys);
    for (let i = 0; i < values.length; i++) {
      if (!values[i]) continue;
      const match = JSON.parse(values[i]!);
      if (match.id === matchId) {
        return { record: match, key: keys[i] };
      }
    }
    return null;
  }

  private async findMatchByExactKey(
    key: string,
    matchId: string,
  ): Promise<{ record: MatchRecord; key: string } | null> {
    const raw = await this.redisService.get(key);
    if (!raw) return null;
    const match = JSON.parse(raw);
    if (match.id === matchId) {
      return { record: match, key };
    }
    return null;
  }

  private async findMatchRecord(
    userId: string,
    matchId: string,
  ): Promise<{ record: MatchRecord; key: string } | null> {
    const exactResult = await this.findMatchByExactKey(
      `${this.MATCH_PREFIX}${matchId}`,
      matchId,
    );
    if (exactResult) return exactResult;

    return this.findMatchByWildcard(
      `${this.MATCH_PREFIX}${userId}:*`,
      matchId,
    );
  }

  async unmatch(userId: string, matchId: string): Promise<{ success: boolean }> {
    const userMatchesKey = `${this.USER_MATCHES_PREFIX}${userId}`;
    const userMatchIds = await this.redisService.sMembers(userMatchesKey);

    if (!userMatchIds.includes(matchId)) {
      this.logger.warn(`unmatch failed (not in user matches) userId=${userId} matchId=${matchId}`);
      return { success: false };
    }

    const found = await this.findMatchRecord(userId, matchId);

    if (!found) {
      this.logger.warn(`unmatch failed (match not found) userId=${userId} matchId=${matchId}`);
      return { success: false };
    }

    const { record: matchRecord, key: matchKey } = found;

    if (matchRecord.userAId !== userId && matchRecord.userBId !== userId) {
      this.logger.warn(`unmatch failed (not owner) userId=${userId} matchId=${matchId}`);
      return { success: false };
    }

    if (matchRecord.status !== 'active') {
      this.logger.warn(`unmatch failed (already unmatched) userId=${userId} matchId=${matchId}`);
      return { success: false };
    }

    matchRecord.status = 'unmatched';
    await this.redisService.set(matchKey, JSON.stringify(matchRecord));

    await Promise.all([
      this.redisService.sRem(`${this.USER_MATCHES_PREFIX}${matchRecord.userAId}`, matchId),
      this.redisService.sRem(`${this.USER_MATCHES_PREFIX}${matchRecord.userBId}`, matchId),
    ]);

    this.logger.log(`unmatch applied userId=${userId} matchId=${matchId}`);

    await this.kafkaProducer.sendEvent(MATCHING_EVENTS.UNMATCHED, {
      matchId,
      unmatchedBy: userId,
      unmatchedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'matching-service' };
  }
}
