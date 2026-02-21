import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MATCHING_EVENTS, DIAMOND_EVENTS } from '@suggar-daddy/common';
import type {
  MatchDto,
  SwipeResponseDto,
  SwipeAction,
  CardsResponseDto,
  MatchesResponseDto,
  GetCardsQuery,
} from '@suggar-daddy/dto';
import { PaymentServiceClient } from './payment-service.client';
import { SwipeService } from './swipe.service';
import { DiscoveryService } from './discovery.service';

// Retained for match-related operations (getMatches, unmatch, boost)
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
  private readonly MATCH_PREFIX = 'match:';
  private readonly USER_MATCHES_PREFIX = 'user_matches:';

  private readonly BOOST_PREFIX = 'boost:active:';
  private readonly BOOST_TTL = 1800; // 30 minutes

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly paymentClient: PaymentServiceClient,
    private readonly swipeService: SwipeService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  // ── Delegated to SwipeService ─────────────────────────────────

  async swipe(
    swiperId: string,
    targetUserId: string,
    action: SwipeAction,
  ): Promise<SwipeResponseDto> {
    return this.swipeService.swipe(swiperId, targetUserId, action);
  }

  // ── Delegated to DiscoveryService ─────────────────────────────

  async getCards(
    userId: string,
    limit: number,
    cursor?: string,
    radiusKm?: number,
  ): Promise<CardsResponseDto> {
    const query: GetCardsQuery = { limit, cursor, radius: radiusKm };
    return this.discoveryService.getCards(userId, query);
  }

  // ── Match operations (retained in facade) ─────────────────────

  async getMatches(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<MatchesResponseDto> {
    const userMatchesKey = `${this.USER_MATCHES_PREFIX}${userId}`;
    const matchIds = await this.redisService.sMembers(userMatchesKey);

    if (matchIds.length === 0) {
      return { matches: [], nextCursor: undefined };
    }

    const matchKeys = matchIds.map((id) => {
      if (id.includes(':')) {
        return `${this.MATCH_PREFIX}${id}`;
      }
      return id;
    });

    const values = await this.redisService.mget(...matchKeys);

    const userMatches: MatchRecord[] = [];
    for (let i = 0; i < values.length; i++) {
      const raw = values[i];
      if (raw) {
        try {
          const match: MatchRecord = JSON.parse(raw);
          if (match.status === 'active') {
            userMatches.push({
              ...match,
              matchedAt: new Date(match.matchedAt),
            });
          }
        } catch (_err) {
          this.logger.warn(
            `Failed to parse match record for key ${matchKeys[i]}`,
          );
        }
      }
    }

    userMatches.sort(
      (a, b) =>
        new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime(),
    );

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

    this.logger.debug(
      `getMatches userId=${userId} total=${userMatches.length} returned=${matches.length}`,
    );

    return { matches, nextCursor };
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

  async unmatch(
    userId: string,
    matchId: string,
  ): Promise<{ success: boolean }> {
    const userMatchesKey = `${this.USER_MATCHES_PREFIX}${userId}`;
    const userMatchIds = await this.redisService.sMembers(userMatchesKey);

    if (!userMatchIds.includes(matchId)) {
      this.logger.warn(
        `unmatch failed (not in user matches) userId=${userId} matchId=${matchId}`,
      );
      return { success: false };
    }

    const found = await this.findMatchRecord(userId, matchId);

    if (!found) {
      this.logger.warn(
        `unmatch failed (match not found) userId=${userId} matchId=${matchId}`,
      );
      return { success: false };
    }

    const { record: matchRecord, key: matchKey } = found;

    if (matchRecord.userAId !== userId && matchRecord.userBId !== userId) {
      this.logger.warn(
        `unmatch failed (not owner) userId=${userId} matchId=${matchId}`,
      );
      return { success: false };
    }

    if (matchRecord.status !== 'active') {
      this.logger.warn(
        `unmatch failed (already unmatched) userId=${userId} matchId=${matchId}`,
      );
      return { success: false };
    }

    matchRecord.status = 'unmatched';
    await this.redisService.set(matchKey, JSON.stringify(matchRecord));

    await Promise.all([
      this.redisService.sRem(
        `${this.USER_MATCHES_PREFIX}${matchRecord.userAId}`,
        matchId,
      ),
      this.redisService.sRem(
        `${this.USER_MATCHES_PREFIX}${matchRecord.userBId}`,
        matchId,
      ),
    ]);

    this.logger.log(`unmatch applied userId=${userId} matchId=${matchId}`);

    await this.kafkaProducer.sendEvent(MATCHING_EVENTS.UNMATCHED, {
      matchId,
      unmatchedBy: userId,
      unmatchedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  // ── Diamond-powered features ─────────────────────────────────

  async applyBoost(
    userId: string,
    authToken: string,
  ): Promise<{ expiresAt: string; cost: number }> {
    const existing = await this.redisService.get(
      `${this.BOOST_PREFIX}${userId}`,
    );
    if (existing) {
      const boost = JSON.parse(existing);
      return { expiresAt: boost.expiresAt, cost: 0 };
    }

    const result = await this.paymentClient.spendOnBoost(userId, authToken);

    const boostData = {
      userId,
      startedAt: new Date().toISOString(),
      expiresAt: result.expiresAt,
      diamondCost: result.cost,
    };
    await this.redisService.setex(
      `${this.BOOST_PREFIX}${userId}`,
      this.BOOST_TTL,
      JSON.stringify(boostData),
    );

    this.logger.log(
      `boost activated userId=${userId} cost=${result.cost} expiresAt=${result.expiresAt}`,
    );

    this.kafkaProducer
      .sendEvent(DIAMOND_EVENTS.BOOST_ACTIVATED, {
        userId,
        cost: result.cost,
        expiresAt: result.expiresAt,
        activatedAt: new Date().toISOString(),
      })
      .catch((err) =>
        this.logger.error('Failed to send BOOST_ACTIVATED event', err),
      );

    return { expiresAt: result.expiresAt, cost: result.cost };
  }

  async spendOnSuperLike(
    userId: string,
    authToken: string,
  ): Promise<{ cost: number }> {
    const result = await this.paymentClient.spendOnSuperLike(
      userId,
      authToken,
    );
    return { cost: result.cost };
  }

  async isUserBoosted(userId: string): Promise<boolean> {
    const exists = await this.redisService.get(
      `${this.BOOST_PREFIX}${userId}`,
    );
    return !!exists;
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'matching-service' };
  }
}
