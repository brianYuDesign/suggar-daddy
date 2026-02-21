import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import type {
  CardsResponseDto,
  EnhancedUserCardDto,
  GetCardsQuery,
  CardDetailResponseDto,
  UserCardDto,
} from '@suggar-daddy/dto';
import { UserServiceClient } from './user-service.client';
import { CompatibilityService } from './compatibility.service';
import { ContentServiceClient } from './content-service.client';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  private readonly GEO_KEY = 'geo:users';
  private readonly DEFAULT_RADIUS_KM = 50;
  private readonly MAX_RADIUS_KM = 500;
  private readonly USER_SWIPES_PREFIX = 'user_swipes:';
  private readonly BOOST_PREFIX = 'boost:active:';

  constructor(
    private readonly redisService: RedisService,
    private readonly userServiceClient: UserServiceClient,
    private readonly compatibilityService: CompatibilityService,
    private readonly contentServiceClient: ContentServiceClient,
  ) {}

  async getCards(
    userId: string,
    query: GetCardsQuery,
  ): Promise<CardsResponseDto> {
    const limit = query.limit ?? 20;
    const cursor = query.cursor;
    const radius = Math.min(
      Math.max(query.radius ?? this.DEFAULT_RADIUS_KM, 1),
      this.MAX_RADIUS_KM,
    );

    // Get user position
    const userPos = await this.redisService.geoPos(this.GEO_KEY, userId);

    // Build exclude set (swiped, blocked)
    const userSwipesKey = `${this.USER_SWIPES_PREFIX}${userId}`;
    const swipedIdsArray = await this.redisService.sMembers(userSwipesKey);
    const limitedSwipedIds =
      swipedIdsArray.length > 1000
        ? swipedIdsArray.slice(0, 1000)
        : swipedIdsArray;

    const [blockedIds, blockedByIds] = await Promise.all([
      this.redisService.sMembers(`user:blocks:${userId}`),
      this.redisService.sMembers(`user:blocked-by:${userId}`),
    ]);
    const excludeSet = new Set([
      userId,
      ...limitedSwipedIds,
      ...blockedIds,
      ...blockedByIds,
    ]);

    let cards: UserCardDto[];
    let distMap = new Map<string, number>();

    if (userPos) {
      // GEO-based discovery
      const result = await this.getCardsByGeo(
        userId,
        userPos,
        radius,
        limit,
        excludeSet,
      );
      cards = result.cards;
      distMap = result.distMap;
    } else {
      // Fallback when no location
      cards = await this.getCardsFallback(userId, limit, excludeSet);
    }

    // Apply basic filters (userType, verified, online)
    cards = this.applyBasicFilters(cards, query);

    // Enhance cards with compatibility scores, age, tags
    const enhanced = await this.enhanceCards(userId, cards, distMap);

    // Apply advanced filters (age range, tags) — requires enhanced data
    const filtered = this.applyAdvancedFilters(enhanced, query);

    // Sort by compatibility score (descending), boosted users first
    filtered.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return b.compatibilityScore - a.compatibilityScore;
    });

    // Apply cursor pagination
    let start = 0;
    if (cursor) {
      const idx = filtered.findIndex((c) => c.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = filtered.slice(start, start + limit);
    const nextCursor =
      start + limit < filtered.length
        ? slice[slice.length - 1]?.id
        : undefined;

    return {
      cards: slice,
      nextCursor,
      totalEstimate: filtered.length,
    };
  }

  async getCardDetail(
    viewerId: string,
    targetUserId: string,
  ): Promise<CardDetailResponseDto> {
    // Fetch user card data
    const cards = await this.userServiceClient.getCardsByIds([targetUserId]);
    const card = cards[0];

    if (!card) {
      this.logger.warn(
        `getCardDetail target user not found viewerId=${viewerId} targetUserId=${targetUserId}`,
      );
      throw new Error('User not found');
    }

    // Fetch photos from user profile (use tags from Redis or user-service)
    const viewerTagsRaw = await this.redisService.get(
      `user:tags:${viewerId}`,
    );
    const candidateTagsRaw = await this.redisService.get(
      `user:tags:${targetUserId}`,
    );
    const viewerTags = viewerTagsRaw ? JSON.parse(viewerTagsRaw) : [];
    const candidateTags = candidateTagsRaw
      ? JSON.parse(candidateTagsRaw)
      : [];

    // Get compatibility score breakdown
    const scoreBreakdown = await this.compatibilityService.calculateScore(
      viewerId,
      targetUserId,
      viewerTags,
      candidateTags,
    );

    // Get recent posts
    const recentPosts = await this.contentServiceClient.getUserRecentPosts(
      targetUserId,
      5,
    );

    // Get distance
    const dist = await this.redisService.geoDist(
      this.GEO_KEY,
      viewerId,
      targetUserId,
    );

    // Get photos list
    const photosRaw = await this.redisService.get(
      `user:photos:${targetUserId}`,
    );
    const photos: string[] = photosRaw ? JSON.parse(photosRaw) : [];
    if (card.avatarUrl && !photos.includes(card.avatarUrl)) {
      photos.unshift(card.avatarUrl);
    }

    // Get age
    const ageRaw = await this.redisService.get(`user:age:${targetUserId}`);
    const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

    // Common tag count
    const viewerTagIds = new Set(viewerTags.map((t: { id: string }) => t.id));
    const commonTagCount = candidateTags.filter(
      (t: { id: string }) => viewerTagIds.has(t.id),
    ).length;

    const totalScore = this.compatibilityService.getTotalScore(scoreBreakdown);

    return {
      id: card.id,
      username: card.username,
      displayName: card.displayName,
      age,
      bio: card.bio,
      avatarUrl: card.avatarUrl,
      userType: card.userType,
      verificationStatus: card.verificationStatus,
      city: card.city,
      distance: dist ?? card.distance,
      lastActiveAt: card.lastActiveAt,
      compatibilityScore: totalScore,
      photos,
      tags: candidateTags,
      commonTagCount,
      recentPosts,
      scoreBreakdown: {
        userTypeMatch: scoreBreakdown.userTypeMatch,
        distanceScore: scoreBreakdown.distanceScore,
        ageScore: scoreBreakdown.ageScore,
        tagScore: scoreBreakdown.tagScore,
        behaviorScore: scoreBreakdown.behaviorScore,
      },
    };
  }

  // ── Private helpers ─────────────────────────────────────────

  private async getCardsByGeo(
    _userId: string,
    userPos: { longitude: number; latitude: number },
    radiusKm: number,
    limit: number,
    excludeSet: Set<string>,
  ): Promise<{ cards: UserCardDto[]; distMap: Map<string, number> }> {
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
      return { cards: await this.getCardsFallback(_userId, limit, excludeSet), distMap: new Map() };
    }

    const filtered = nearbyUsers.filter((u) => !excludeSet.has(u.member));
    if (filtered.length === 0) {
      return { cards: [], distMap: new Map() };
    }

    const candidateIds = filtered.map((u) => u.member);
    const distMap = new Map(filtered.map((u) => [u.member, u.distance]));

    let cards: UserCardDto[];
    try {
      cards = await this.userServiceClient.getCardsByIds(candidateIds);
    } catch (err) {
      this.logger.warn(
        'user-service getCardsByIds failed, returning empty',
        err,
      );
      return { cards: [], distMap: new Map() };
    }

    // Attach distance
    cards = cards.map((card) => ({
      ...card,
      distance: distMap.get(card.id) ?? undefined,
    }));

    return { cards, distMap };
  }

  private async getCardsFallback(
    _userId: string,
    limit: number,
    excludeSet: Set<string>,
  ): Promise<UserCardDto[]> {
    const requestLimit = Math.max(limit * 2, 50);
    try {
      let available = await this.userServiceClient.getCardsForRecommendation(
        Array.from(excludeSet),
        requestLimit,
      );
      available = available.filter((c) => !excludeSet.has(c.id));
      return available;
    } catch (err) {
      this.logger.warn('user-service getCards failed, returning empty', err);
      return [];
    }
  }

  private applyBasicFilters(
    cards: UserCardDto[],
    query: GetCardsQuery,
  ): UserCardDto[] {
    let filtered = cards;

    // Filter by userType
    if (query.userType) {
      filtered = filtered.filter((c) => c.userType === query.userType);
    }

    // Filter by verified only
    if (query.verifiedOnly) {
      filtered = filtered.filter((c) => c.verificationStatus === 'verified');
    }

    // Filter by online recently (active within last 24 hours)
    if (query.onlineRecently) {
      const onlineThreshold = Date.now() - 24 * 60 * 60 * 1000;
      filtered = filtered.filter((c) => {
        const lastActive = c.lastActiveAt
          ? new Date(c.lastActiveAt).getTime()
          : 0;
        return lastActive > onlineThreshold;
      });
    }

    return filtered;
  }

  private applyAdvancedFilters(
    cards: EnhancedUserCardDto[],
    query: GetCardsQuery,
  ): EnhancedUserCardDto[] {
    let filtered = cards;

    // Filter by age range
    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      const ageMin = query.ageMin ?? 18;
      const ageMax = query.ageMax ?? 99;
      filtered = filtered.filter((c) => {
        if (c.age === undefined) return true; // Include users without age
        return c.age >= ageMin && c.age <= ageMax;
      });
    }

    // Filter by interest tags (comma-separated tag IDs — match ANY)
    if (query.tags) {
      const requestedTagIds = new Set(
        query.tags.split(',').map((t) => t.trim()).filter(Boolean),
      );
      if (requestedTagIds.size > 0) {
        filtered = filtered.filter((c) => {
          if (!c.tags?.length) return false;
          return c.tags.some((t) => requestedTagIds.has(t.id));
        });
      }
    }

    return filtered;
  }

  private async enhanceCards(
    viewerId: string,
    cards: UserCardDto[],
    distMap: Map<string, number>,
  ): Promise<EnhancedUserCardDto[]> {
    const enhanced: EnhancedUserCardDto[] = [];

    // Batch check boost status
    const boostKeys = cards.map((c) => `${this.BOOST_PREFIX}${c.id}`);
    const boostStatuses = await this.redisService.batchExists(boostKeys);

    // Get viewer tags for compatibility
    const viewerTagsRaw = await this.redisService.get(
      `user:tags:${viewerId}`,
    );
    const viewerTags = viewerTagsRaw ? JSON.parse(viewerTagsRaw) : [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const isBoosted = boostStatuses[i] ?? false;

      // Get candidate tags
      const candidateTagsRaw = await this.redisService.get(
        `user:tags:${card.id}`,
      );
      const candidateTags = candidateTagsRaw
        ? JSON.parse(candidateTagsRaw)
        : [];

      // Calculate compatibility
      const breakdown = await this.compatibilityService.calculateScore(
        viewerId,
        card.id,
        viewerTags,
        candidateTags,
      );
      const totalScore = this.compatibilityService.getTotalScore(breakdown);

      // Common tag count
      const viewerTagIds = new Set(
        viewerTags.map((t: { id: string }) => t.id),
      );
      const commonTagCount = candidateTags.filter(
        (t: { id: string }) => viewerTagIds.has(t.id),
      ).length;

      // Get age
      const ageRaw = await this.redisService.get(`user:age:${card.id}`);
      const age = ageRaw ? parseInt(ageRaw, 10) : undefined;

      enhanced.push({
        ...card,
        age,
        distance: distMap.get(card.id) ?? card.distance,
        compatibilityScore: totalScore,
        commonTagCount,
        isBoosted,
        tags: candidateTags,
      });
    }

    return enhanced;
  }
}
