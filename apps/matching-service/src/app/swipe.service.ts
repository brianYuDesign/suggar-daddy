import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MATCHING_EVENTS } from '@suggar-daddy/common';
import type {
  SwipeAction,
  SwipeResponseDto,
  UndoResponseDto,
  EnhancedUserCardDto,
} from '@suggar-daddy/dto';
import { PaymentServiceClient } from './payment-service.client';
import { SubscriptionServiceClient } from './subscription-service.client';
import { UserServiceClient } from './user-service.client';
import { CompatibilityService } from './compatibility.service';

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
export class SwipeService {
  private readonly logger = new Logger(SwipeService.name);

  private readonly SWIPE_PREFIX = 'swipe:';
  private readonly MATCH_PREFIX = 'match:';
  private readonly USER_SWIPES_PREFIX = 'user_swipes:';
  private readonly USER_MATCHES_PREFIX = 'user_matches:';
  private readonly SWIPE_COUNTER_PREFIX = 'swipe_counter:';
  private readonly LAST_SWIPE_PREFIX = 'last_swipe:';
  private readonly LIKES_RECEIVED_PREFIX = 'likes_received:';
  private readonly UNDO_COUNTER_PREFIX = 'undo_counter:';

  private readonly DAILY_SWIPE_LIMIT = 100;
  private readonly SWIPE_COUNTER_TTL = 86400; // 24 hours
  private readonly UNDO_COUNTER_TTL = 86400; // 24 hours
  private readonly FREE_UNDO_LIMIT = 1;
  private readonly SUBSCRIBER_UNDO_LIMIT = 5;
  private readonly UNDO_DIAMOND_COST = 10;

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly paymentClient: PaymentServiceClient,
    private readonly subscriptionClient: SubscriptionServiceClient,
    private readonly userServiceClient: UserServiceClient,
    private readonly compatibilityService: CompatibilityService,
  ) {}

  async swipe(
    swiperId: string,
    targetUserId: string,
    action: SwipeAction,
  ): Promise<SwipeResponseDto> {
    // Check daily swipe limit
    const today = new Date().toISOString().split('T')[0];
    const counterKey = `${this.SWIPE_COUNTER_PREFIX}${swiperId}:${today}`;

    const currentCount = await this.redisService.get(counterKey);
    const swipeCount = currentCount ? parseInt(currentCount, 10) : 0;

    if (swipeCount >= this.DAILY_SWIPE_LIMIT) {
      this.logger.warn(`Daily swipe limit reached for user ${swiperId}`);
      throw new Error(
        `Daily swipe limit reached (${this.DAILY_SWIPE_LIMIT}). Try again tomorrow!`,
      );
    }

    // Check if already swiped
    const swipeKey = `${this.SWIPE_PREFIX}${swiperId}:${targetUserId}`;
    const existing = await this.redisService.get(swipeKey);

    if (!existing) {
      // Store swipe record
      const swipeRecord: SwipeRecord = {
        swiperId,
        swipedId: targetUserId,
        action,
        createdAt: new Date(),
      };
      await this.redisService.set(swipeKey, JSON.stringify(swipeRecord));

      // Add to user's swipes set
      const userSwipesKey = `${this.USER_SWIPES_PREFIX}${swiperId}`;
      await this.redisService.sAdd(userSwipesKey, targetUserId);

      // Increment daily swipe counter
      const newCount = await this.redisService.incr(counterKey);
      if (newCount === 1) {
        await this.redisService.expire(counterKey, this.SWIPE_COUNTER_TTL);
      }

      // Store last swipe for undo support
      await this.redisService.set(
        `${this.LAST_SWIPE_PREFIX}${swiperId}`,
        JSON.stringify(swipeRecord),
        this.SWIPE_COUNTER_TTL,
      );

      // On like/super_like, add to target's likes_received sorted set
      if (action === 'like' || action === 'super_like') {
        const likesKey = `${this.LIKES_RECEIVED_PREFIX}${targetUserId}`;
        await this.redisService.zAdd(likesKey, Date.now(), swiperId);
      }

      this.logger.log(
        `swipe recorded swiperId=${swiperId} targetUserId=${targetUserId} action=${action} dailyCount=${newCount}`,
      );

      // Publish swipe event (fire-and-forget)
      this.kafkaProducer
        .sendEvent(MATCHING_EVENTS.SWIPE, {
          swiperId,
          targetUserId,
          action,
          timestamp: new Date().toISOString(),
        })
        .catch((err) =>
          this.logger.error('Failed to send SWIPE event', err),
        );
    }

    // Check for mutual like (match)
    if (action === 'like' || action === 'super_like') {
      const reverseSwipeKey = `${this.SWIPE_PREFIX}${targetUserId}:${swiperId}`;
      const reverseSwipe = await this.redisService.get(reverseSwipeKey);

      if (reverseSwipe) {
        const reverseRecord: SwipeRecord = JSON.parse(reverseSwipe);
        const mutualLike =
          reverseRecord.action === 'like' ||
          reverseRecord.action === 'super_like';

        if (mutualLike) {
          // Check if match already exists
          const matchKey1 = `${this.MATCH_PREFIX}${swiperId}:${targetUserId}`;
          const matchKey2 = `${this.MATCH_PREFIX}${targetUserId}:${swiperId}`;
          const existingMatch1 = await this.redisService.get(matchKey1);
          const existingMatch2 = await this.redisService.get(matchKey2);

          if (!existingMatch1 && !existingMatch2) {
            // Create new match
            const match: MatchRecord = {
              id: `match-${Date.now()}`,
              userAId: swiperId,
              userBId: targetUserId,
              matchedAt: new Date(),
              status: 'active',
            };

            await this.redisService.set(matchKey1, JSON.stringify(match));

            await this.redisService.sAdd(
              `${this.USER_MATCHES_PREFIX}${swiperId}`,
              match.id,
            );
            await this.redisService.sAdd(
              `${this.USER_MATCHES_PREFIX}${targetUserId}`,
              match.id,
            );

            this.logger.log(
              `match created matchId=${match.id} userA=${swiperId} userB=${targetUserId}`,
            );

            await this.kafkaProducer.sendEvent(MATCHING_EVENTS.MATCHED, {
              matchId: match.id,
              userAId: swiperId,
              userBId: targetUserId,
              matchedAt: match.matchedAt.toISOString(),
            });

            return { matched: true, matchId: match.id };
          }

          const existingMatchRecord: MatchRecord = JSON.parse(
            existingMatch1 || existingMatch2!,
          );
          this.logger.log(
            `mutual like (existing match) matchId=${existingMatchRecord.id} swiperId=${swiperId} targetUserId=${targetUserId}`,
          );
          return { matched: true, matchId: existingMatchRecord.id };
        }
      }
    }

    return { matched: false };
  }

  async undo(
    userId: string,
    authToken: string,
  ): Promise<UndoResponseDto> {
    // Get last swipe
    const lastSwipeRaw = await this.redisService.get(
      `${this.LAST_SWIPE_PREFIX}${userId}`,
    );

    if (!lastSwipeRaw) {
      this.logger.warn(`undo failed (no last swipe) userId=${userId}`);
      return {
        undone: false,
        matchRevoked: false,
        diamondCost: 0,
        freeUndosRemaining: 0,
      };
    }

    const lastSwipe: SwipeRecord = JSON.parse(lastSwipeRaw);
    const targetUserId = lastSwipe.swipedId;

    // Check subscription tier for undo limits
    const tierInfo = await this.subscriptionClient.getUserTier(
      userId,
      authToken,
    );
    const undoLimit = tierInfo.isSubscriber
      ? this.SUBSCRIBER_UNDO_LIMIT
      : this.FREE_UNDO_LIMIT;

    // Check undo counter
    const today = new Date().toISOString().split('T')[0];
    const undoCounterKey = `${this.UNDO_COUNTER_PREFIX}${userId}:${today}`;
    const undoCountRaw = await this.redisService.get(undoCounterKey);
    const undoCount = undoCountRaw ? parseInt(undoCountRaw, 10) : 0;

    let diamondCost = 0;

    if (undoCount >= undoLimit) {
      // Charge diamonds for extra undos
      diamondCost = this.UNDO_DIAMOND_COST;
      try {
        await this.paymentClient.spendDiamonds(
          userId, this.UNDO_DIAMOND_COST, 'undo', authToken,
          `Undo swipe (${this.UNDO_DIAMOND_COST} diamonds)`,
        );
      } catch (err) {
        this.logger.warn(
          `undo failed (insufficient diamonds) userId=${userId}`,
          err,
        );
        return {
          undone: false,
          matchRevoked: false,
          diamondCost: this.UNDO_DIAMOND_COST,
          freeUndosRemaining: 0,
        };
      }
    }

    // Delete the swipe record
    const swipeKey = `${this.SWIPE_PREFIX}${userId}:${targetUserId}`;
    await this.redisService.del(swipeKey);

    // Remove from user's swipes set
    await this.redisService.sRem(
      `${this.USER_SWIPES_PREFIX}${userId}`,
      targetUserId,
    );

    // Remove from likes_received if it was a like/super_like
    if (lastSwipe.action === 'like' || lastSwipe.action === 'super_like') {
      await this.redisService.zRem(
        `${this.LIKES_RECEIVED_PREFIX}${targetUserId}`,
        userId,
      );
    }

    // Check if there was a match that needs revoking
    let matchRevoked = false;
    const matchKey1 = `${this.MATCH_PREFIX}${userId}:${targetUserId}`;
    const matchKey2 = `${this.MATCH_PREFIX}${targetUserId}:${userId}`;
    const matchRaw1 = await this.redisService.get(matchKey1);
    const matchRaw2 = await this.redisService.get(matchKey2);
    const matchRaw = matchRaw1 || matchRaw2;
    const matchKey = matchRaw1 ? matchKey1 : matchKey2;

    if (matchRaw) {
      const matchRecord: MatchRecord = JSON.parse(matchRaw);
      if (matchRecord.status === 'active') {
        matchRecord.status = 'unmatched';
        await this.redisService.set(matchKey, JSON.stringify(matchRecord));

        await Promise.all([
          this.redisService.sRem(
            `${this.USER_MATCHES_PREFIX}${matchRecord.userAId}`,
            matchRecord.id,
          ),
          this.redisService.sRem(
            `${this.USER_MATCHES_PREFIX}${matchRecord.userBId}`,
            matchRecord.id,
          ),
        ]);

        matchRevoked = true;
        this.logger.log(
          `match revoked via undo matchId=${matchRecord.id} userId=${userId}`,
        );
      }
    }

    // Clear last swipe
    await this.redisService.del(`${this.LAST_SWIPE_PREFIX}${userId}`);

    // Increment undo counter
    const newUndoCount = await this.redisService.incr(undoCounterKey);
    if (newUndoCount === 1) {
      await this.redisService.expire(undoCounterKey, this.UNDO_COUNTER_TTL);
    }

    const freeUndosRemaining = Math.max(undoLimit - newUndoCount, 0);

    this.logger.log(
      `undo completed userId=${userId} targetUserId=${targetUserId} matchRevoked=${matchRevoked} diamondCost=${diamondCost}`,
    );

    // Publish undo event
    this.kafkaProducer
      .sendEvent(MATCHING_EVENTS.UNDO, {
        userId,
        targetUserId,
        originalAction: lastSwipe.action,
        matchRevoked,
        timestamp: new Date().toISOString(),
      })
      .catch((err) =>
        this.logger.error('Failed to send UNDO event', err),
      );

    // Fetch card data for the undone target so UI can re-display it
    let card: EnhancedUserCardDto | undefined;
    try {
      const cards = await this.userServiceClient.getCardsByIds([targetUserId]);
      if (cards[0]) {
        const userCard = cards[0];
        // Get tags and age
        const [tagsRaw, ageRaw, isBoosted] = await Promise.all([
          this.redisService.get(`user:tags:${targetUserId}`),
          this.redisService.get(`user:age:${targetUserId}`),
          this.redisService.exists(`boost:active:${targetUserId}`),
        ]);
        const tags = tagsRaw ? JSON.parse(tagsRaw) : [];
        const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

        // Calculate compatibility
        const viewerTagsRaw = await this.redisService.get(`user:tags:${userId}`);
        const viewerTags = viewerTagsRaw ? JSON.parse(viewerTagsRaw) : [];
        const breakdown = await this.compatibilityService.calculateScore(
          userId, targetUserId, viewerTags, tags,
        );
        const totalScore = this.compatibilityService.getTotalScore(breakdown);

        const viewerTagIds = new Set(viewerTags.map((t: { id: string }) => t.id));
        const commonTagCount = tags.filter((t: { id: string }) => viewerTagIds.has(t.id)).length;

        card = {
          ...userCard,
          age,
          compatibilityScore: totalScore,
          commonTagCount,
          isBoosted,
          tags,
        };
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch card for undo response userId=${userId} target=${targetUserId}`, err);
    }

    return {
      undone: true,
      card,
      matchRevoked,
      diamondCost,
      freeUndosRemaining,
    };
  }
}
