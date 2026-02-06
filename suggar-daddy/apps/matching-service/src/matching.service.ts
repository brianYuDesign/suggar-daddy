import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { SwipeEntity, MatchEntity, UserEntity } from '@suggar-daddy/database';
import { RedisService } from './redis/redis.service';
import { KAFKA_TOPICS, REDIS_KEYS } from '@suggar-daddy/common';

interface SwipeResult {
  matched: boolean;
  matchId?: string;
}

interface UserCard {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  photos: string[];
  age?: number;
  distance?: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly CARD_CACHE_TTL = 300; // 5 minutes
  private readonly CARD_BATCH_SIZE = 50;

  constructor(
    @InjectRepository(SwipeEntity)
    private readonly swipeRepository: Repository<SwipeEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchRepository: Repository<MatchEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  async swipe(
    swiperId: string,
    swipedId: string,
    action: 'like' | 'pass' | 'super_like',
  ): Promise<SwipeResult> {
    // 1. Check if already swiped
    const existingSwipe = await this.swipeRepository.findOne({
      where: { swiperId, swipedId },
    });

    if (existingSwipe) {
      return { matched: false };
    }

    // 2. Save swipe
    await this.swipeRepository.save({
      swiperId,
      swipedId,
      action,
    });

    // 3. If not like, no match possible
    if (action === 'pass') {
      return { matched: false };
    }

    // 4. Add to Redis likes set for quick lookup
    const likesKey = REDIS_KEYS.USER_LIKES(swiperId);
    await this.redisService.sadd(likesKey, swipedId);
    await this.redisService.expire(likesKey, 86400); // 24 hours

    // 5. Check for mutual like
    const mutualLike = await this.checkMutualLike(swiperId, swipedId);

    if (mutualLike) {
      // 6. Create match
      const match = await this.createMatch(swiperId, swipedId);

      // 7. Emit matched event
      this.kafkaClient.emit(KAFKA_TOPICS.MATCHING_MATCHED, {
        matchId: match.id,
        userAId: swiperId,
        userBId: swipedId,
        matchedAt: match.matchedAt,
      });

      this.logger.log(`Match created: ${match.id}`);
      return { matched: true, matchId: match.id };
    }

    return { matched: false };
  }

  private async checkMutualLike(userA: string, userB: string): Promise<boolean> {
    // Check Redis first
    const likesKey = REDIS_KEYS.USER_LIKES(userB);
    const cached = await this.redisService.sismember(likesKey, userA);

    if (cached) {
      return true;
    }

    // Fallback to DB
    const swipe = await this.swipeRepository.findOne({
      where: {
        swiperId: userB,
        swipedId: userA,
        action: In(['like', 'super_like']),
      },
    });

    return !!swipe;
  }

  private async createMatch(userAId: string, userBId: string): Promise<MatchEntity> {
    // Ensure consistent ordering to avoid duplicates
    const [first, second] = [userAId, userBId].sort();

    const existing = await this.matchRepository.findOne({
      where: { userAId: first, userBId: second },
    });

    if (existing) {
      return existing;
    }

    return this.matchRepository.save({
      userAId: first,
      userBId: second,
      status: 'active',
    });
  }

  async getCards(userId: string, limit: number): Promise<UserCard[]> {
    const cacheKey = REDIS_KEYS.USER_CARDS(userId);

    // Try to get from cache
    let cachedCards = await this.redisService.lrange(cacheKey, 0, limit - 1);

    if (cachedCards.length < limit) {
      // Generate more cards
      const newCards = await this.generateCards(userId, this.CARD_BATCH_SIZE);

      if (newCards.length > 0) {
        await this.redisService.rpush(cacheKey, ...newCards.map((c) => JSON.stringify(c)));
        await this.redisService.expire(cacheKey, this.CARD_CACHE_TTL);
      }

      cachedCards = await this.redisService.lrange(cacheKey, 0, limit - 1);
    }

    // Remove served cards from cache
    await this.redisService.ltrim(cacheKey, limit, -1);

    return cachedCards.map((c) => JSON.parse(c));
  }

  private async generateCards(userId: string, count: number): Promise<UserCard[]> {
    // Get already swiped user IDs
    const swipedIds = await this.getSwipedUserIds(userId);

    // Query for potential matches
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere(swipedIds.length > 0 ? 'user.id NOT IN (:...swipedIds)' : '1=1', { swipedIds })
      .orderBy('user.lastActiveAt', 'DESC')
      .limit(count)
      .getMany();

    return users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      photos: user.photos || [],
      age: user.birthDate ? this.calculateAge(user.birthDate) : undefined,
    }));
  }

  private async getSwipedUserIds(userId: string): Promise<string[]> {
    const swipes = await this.swipeRepository.find({
      where: { swiperId: userId },
      select: ['swipedId'],
    });

    return swipes.map((s) => s.swipedId);
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  async getMatches(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ matches: MatchEntity[]; nextCursor?: string }> {
    const query = this.matchRepository
      .createQueryBuilder('match')
      .where('(match.userAId = :userId OR match.userBId = :userId)', { userId })
      .andWhere('match.status = :status', { status: 'active' })
      .orderBy('match.matchedAt', 'DESC')
      .limit(limit + 1);

    if (cursor) {
      query.andWhere('match.matchedAt < :cursor', { cursor: new Date(cursor) });
    }

    const matches = await query.getMany();

    const hasMore = matches.length > limit;
    const result = hasMore ? matches.slice(0, limit) : matches;
    const nextCursor = hasMore ? result[result.length - 1].matchedAt.toISOString() : undefined;

    return { matches: result, nextCursor };
  }

  async unmatch(userId: string, matchId: string): Promise<{ success: boolean }> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      return { success: false };
    }

    // Verify user is part of the match
    if (match.userAId !== userId && match.userBId !== userId) {
      return { success: false };
    }

    await this.matchRepository.update(matchId, { status: 'unmatched' });

    return { success: true };
  }

  async invalidateUserCards(userId: string): Promise<void> {
    const cacheKey = REDIS_KEYS.USER_CARDS(userId);
    await this.redisService.del(cacheKey);
  }
}
