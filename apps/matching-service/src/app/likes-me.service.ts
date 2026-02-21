import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { MATCHING_EVENTS } from '@suggar-daddy/common';
import type {
  LikesMeResponseDto,
  LikesMeCardDto,
  RevealLikeResponseDto,
  EnhancedUserCardDto,
} from '@suggar-daddy/dto';
import { PaymentServiceClient } from './payment-service.client';
import { UserServiceClient } from './user-service.client';
import { CompatibilityService } from './compatibility.service';

@Injectable()
export class LikesMeService {
  private readonly logger = new Logger(LikesMeService.name);

  private readonly LIKES_RECEIVED_PREFIX = 'likes_received:';
  private readonly SWIPE_PREFIX = 'swipe:';
  private readonly USER_SWIPES_PREFIX = 'user_swipes:';
  private readonly BOOST_PREFIX = 'boost:active:';
  private readonly REVEAL_DIAMOND_COST = 20;

  constructor(
    private readonly redisService: RedisService,
    private readonly paymentClient: PaymentServiceClient,
    private readonly userServiceClient: UserServiceClient,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly compatibilityService: CompatibilityService,
  ) {}

  async getLikes(
    userId: string,
    isSubscriber: boolean,
    limit: number,
    cursor?: string,
  ): Promise<LikesMeResponseDto> {
    const likesKey = `${this.LIKES_RECEIVED_PREFIX}${userId}`;

    // Get total count
    const count = await this.redisService.zCard(likesKey);

    if (count === 0) {
      return { count: 0, cards: [], nextCursor: undefined };
    }

    // Parse cursor for pagination offset
    const offset = cursor ? parseInt(cursor, 10) : 0;

    // Get likers from sorted set (most recent first)
    const likerIds = await this.redisService.zRevRange(
      likesKey,
      offset,
      offset + limit - 1,
    );

    if (likerIds.length === 0) {
      return { count, cards: [], nextCursor: undefined };
    }

    // Filter out already-swiped-back and blocked users
    const userSwipesKey = `${this.USER_SWIPES_PREFIX}${userId}`;
    const [swipedIds, blockedIds, blockedByIds] = await Promise.all([
      this.redisService.sMembers(userSwipesKey),
      this.redisService.sMembers(`user:blocks:${userId}`),
      this.redisService.sMembers(`user:blocked-by:${userId}`),
    ]);
    const excludeSet = new Set([...swipedIds, ...blockedIds, ...blockedByIds]);

    const filteredLikerIds = likerIds.filter((id) => !excludeSet.has(id));

    if (filteredLikerIds.length === 0) {
      const nextCursor =
        offset + limit < count ? String(offset + limit) : undefined;
      return { count, cards: [], nextCursor };
    }

    // Get user card data for likers
    let likerCards: LikesMeCardDto[];
    try {
      const userCards =
        await this.userServiceClient.getCardsByIds(filteredLikerIds);

      // Batch fetch swipe records to check super_like status (pipeline)
      const swipeKeys = filteredLikerIds.map(
        (id) => `${this.SWIPE_PREFIX}${id}:${userId}`,
      );
      const swipeResults = await this.redisService.mget(...swipeKeys);
      const superLikeMap = new Map<string, boolean>();
      for (let i = 0; i < filteredLikerIds.length; i++) {
        if (swipeResults[i]) {
          const record = JSON.parse(swipeResults[i]!);
          superLikeMap.set(filteredLikerIds[i], record.action === 'super_like');
        }
      }

      likerCards = userCards.map((card) => {
        const isSuperLike = superLikeMap.get(card.id) ?? false;

        const likeCard: LikesMeCardDto = {
          id: card.id,
          isBlurred: !isSubscriber,
          isSuperLike,
          likedAt: card.lastActiveAt ?? new Date(),
          userType: isSubscriber ? card.userType : undefined,
        };

        if (isSubscriber) {
          likeCard.displayName = card.displayName;
          likeCard.avatarUrl = card.avatarUrl;
          likeCard.city = card.city;
        } else {
          likeCard.displayName = undefined;
          likeCard.avatarUrl = undefined;
        }

        return likeCard;
      });
    } catch (err) {
      this.logger.warn(
        `Failed to fetch liker cards userId=${userId}`,
        err,
      );
      likerCards = [];
    }

    const nextCursor =
      offset + limit < count ? String(offset + limit) : undefined;

    return {
      count,
      cards: likerCards,
      nextCursor,
    };
  }

  async reveal(
    userId: string,
    likerId: string,
    authToken: string,
  ): Promise<RevealLikeResponseDto> {
    // Verify the liker actually liked this user
    const likesKey = `${this.LIKES_RECEIVED_PREFIX}${userId}`;
    const likerScore = await this.redisService.zScore(likesKey, likerId);

    if (likerScore === null) {
      this.logger.warn(
        `reveal failed (no like found) userId=${userId} likerId=${likerId}`,
      );
      throw new Error('This user has not liked you');
    }

    // Spend diamonds via payment-service
    let balance: number;
    try {
      const result = await this.paymentClient.spendDiamonds(
        userId, this.REVEAL_DIAMOND_COST, 'reveal', authToken,
        `Reveal who liked you (${this.REVEAL_DIAMOND_COST} diamonds)`,
      );
      balance = result.balance;
    } catch (err) {
      this.logger.warn(
        `reveal failed (diamond spend failed) userId=${userId}`,
        err,
      );
      throw new Error('Insufficient diamonds to reveal this like');
    }

    // Get full card data
    const cards = await this.userServiceClient.getCardsByIds([likerId]);
    const card = cards[0];

    if (!card) {
      throw new Error('User not found');
    }

    // Get tags, age, boost status in parallel
    const [tagsRaw, viewerTagsRaw, ageRaw, isBoosted] = await Promise.all([
      this.redisService.get(`user:tags:${likerId}`),
      this.redisService.get(`user:tags:${userId}`),
      this.redisService.get(`user:age:${likerId}`),
      this.redisService.exists(`${this.BOOST_PREFIX}${likerId}`),
    ]);
    const tags = tagsRaw ? JSON.parse(tagsRaw) : [];
    const viewerTags = viewerTagsRaw ? JSON.parse(viewerTagsRaw) : [];
    const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

    // Calculate real compatibility score
    const breakdown = await this.compatibilityService.calculateScore(
      userId, likerId, viewerTags, tags,
    );
    const totalScore = this.compatibilityService.getTotalScore(breakdown);

    // Common tag count
    const viewerTagIds = new Set(viewerTags.map((t: { id: string }) => t.id));
    const commonTagCount = tags.filter((t: { id: string }) => viewerTagIds.has(t.id)).length;

    const enhancedCard: EnhancedUserCardDto = {
      ...card,
      age,
      compatibilityScore: totalScore,
      commonTagCount,
      isBoosted,
      tags,
    };

    this.logger.log(
      `like revealed userId=${userId} likerId=${likerId} cost=${this.REVEAL_DIAMOND_COST}`,
    );

    // Publish reveal event (fire-and-forget)
    this.kafkaProducer
      .sendEvent(MATCHING_EVENTS.LIKES_ME_REVEALED, {
        userId,
        likerId,
        diamondCost: this.REVEAL_DIAMOND_COST,
        revealedAt: new Date().toISOString(),
      })
      .catch((err) =>
        this.logger.error('Failed to send LIKES_ME_REVEALED event', err),
      );

    return {
      card: enhancedCard,
      diamondCost: this.REVEAL_DIAMOND_COST,
      diamondBalance: balance,
    };
  }
}
