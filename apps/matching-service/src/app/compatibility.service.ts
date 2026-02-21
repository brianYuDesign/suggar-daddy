import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { MlClientService } from './ml-client.service';
import type { InterestTagDto } from '@suggar-daddy/dto';

export interface ScoreBreakdown {
  userTypeMatch: number;
  distanceScore: number;
  ageScore: number;
  tagScore: number;
  behaviorScore: number;
}

@Injectable()
export class CompatibilityService {
  private readonly logger = new Logger(CompatibilityService.name);

  private readonly COMPAT_PREFIX = 'compat:';
  private readonly COMPAT_TTL = 86400; // 24 hours
  private readonly POPULARITY_PREFIX = 'popularity:';
  private readonly SWIPE_COUNTER_PREFIX = 'swipe_counter:';
  private readonly LIKES_RECEIVED_PREFIX = 'likes_received:';

  // Cold-start thresholds
  private readonly COLD_START_THRESHOLD = 20;
  private readonly WARM_START_THRESHOLD = 50;

  // Score weights (max total = 100)
  private readonly WEIGHT_USER_TYPE = 30;
  private readonly WEIGHT_DISTANCE = 20;
  private readonly WEIGHT_AGE = 15;
  private readonly WEIGHT_TAGS = 20;
  private readonly WEIGHT_BEHAVIOR = 15;

  constructor(
    private readonly redisService: RedisService,
    private readonly mlClient: MlClientService,
  ) {}

  async calculateScore(
    viewerId: string,
    candidateId: string,
    viewerTags?: InterestTagDto[],
    candidateTags?: InterestTagDto[],
  ): Promise<ScoreBreakdown> {
    // Check cache
    const cacheKey = `${this.COMPAT_PREFIX}${viewerId}:${candidateId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(
        `compatibility cache hit viewer=${viewerId} candidate=${candidateId}`,
      );
      return JSON.parse(cached) as ScoreBreakdown;
    }

    // Calculate each factor
    const userTypeMatch = await this.calculateUserTypeScore(
      viewerId,
      candidateId,
    );
    const distanceScore = await this.calculateDistanceScore(
      viewerId,
      candidateId,
    );
    const ageScore = await this.calculateAgeScore(viewerId, candidateId);
    const tagScore = this.calculateTagScore(viewerTags, candidateTags);
    const behaviorScore = await this.calculateBehaviorScore(
      viewerId,
      candidateId,
    );

    const breakdown: ScoreBreakdown = {
      userTypeMatch,
      distanceScore,
      ageScore,
      tagScore,
      behaviorScore,
    };

    // Cache result
    await this.redisService.set(cacheKey, JSON.stringify(breakdown), this.COMPAT_TTL);

    this.logger.debug(
      `compatibility calculated viewer=${viewerId} candidate=${candidateId} ` +
        `total=${userTypeMatch + distanceScore + ageScore + tagScore + behaviorScore}`,
    );

    return breakdown;
  }

  async invalidateScores(userId: string): Promise<void> {
    const pattern = `${this.COMPAT_PREFIX}${userId}:*`;
    const keys = await this.redisService.scan(pattern);

    const reversePattern = `${this.COMPAT_PREFIX}*:${userId}`;
    const reverseKeys = await this.redisService.scan(reversePattern);

    const allKeys = [...keys, ...reverseKeys];
    for (const key of allKeys) {
      await this.redisService.del(key);
    }

    this.logger.log(
      `invalidated ${allKeys.length} compatibility scores for userId=${userId}`,
    );
  }

  async getPopularityScore(userId: string): Promise<number> {
    const raw = await this.redisService.get(`${this.POPULARITY_PREFIX}${userId}`);
    return raw ? parseFloat(raw) : 0;
  }

  getTotalScore(breakdown: ScoreBreakdown): number {
    return (
      breakdown.userTypeMatch +
      breakdown.distanceScore +
      breakdown.ageScore +
      breakdown.tagScore +
      breakdown.behaviorScore
    );
  }

  // ── Private scoring methods ─────────────────────────────────

  private async calculateUserTypeScore(
    viewerId: string,
    candidateId: string,
  ): Promise<number> {
    try {
      const [viewerType, candidateType] = await Promise.all([
        this.redisService.get(`user:type:${viewerId}`),
        this.redisService.get(`user:type:${candidateId}`),
      ]);

      if (!viewerType || !candidateType) return this.WEIGHT_USER_TYPE * 0.5;

      // Complementary types get full score
      if (
        (viewerType === 'sugar_daddy' && candidateType === 'sugar_baby') ||
        (viewerType === 'sugar_baby' && candidateType === 'sugar_daddy')
      ) {
        return this.WEIGHT_USER_TYPE;
      }

      // Same type gets partial score
      return this.WEIGHT_USER_TYPE * 0.3;
    } catch {
      return this.WEIGHT_USER_TYPE * 0.5;
    }
  }

  private async calculateDistanceScore(
    viewerId: string,
    candidateId: string,
  ): Promise<number> {
    try {
      const GEO_KEY = 'geo:users';
      const dist = await this.redisService.geoDist(
        GEO_KEY,
        viewerId,
        candidateId,
      );

      if (dist === null) return this.WEIGHT_DISTANCE * 0.5;

      // Closer = higher score. Under 10km = full score, over 200km = minimal
      if (dist <= 10) return this.WEIGHT_DISTANCE;
      if (dist <= 25) return this.WEIGHT_DISTANCE * 0.85;
      if (dist <= 50) return this.WEIGHT_DISTANCE * 0.7;
      if (dist <= 100) return this.WEIGHT_DISTANCE * 0.5;
      if (dist <= 200) return this.WEIGHT_DISTANCE * 0.3;
      return this.WEIGHT_DISTANCE * 0.1;
    } catch {
      return this.WEIGHT_DISTANCE * 0.5;
    }
  }

  private async calculateAgeScore(
    viewerId: string,
    candidateId: string,
  ): Promise<number> {
    try {
      const [viewerAge, candidateAge] = await Promise.all([
        this.redisService.get(`user:age:${viewerId}`),
        this.redisService.get(`user:age:${candidateId}`),
      ]);

      if (!viewerAge || !candidateAge) return this.WEIGHT_AGE * 0.5;

      // Check viewer's preferred age range
      const [prefMin, prefMax] = await Promise.all([
        this.redisService.get(`user:pref_age_min:${viewerId}`),
        this.redisService.get(`user:pref_age_max:${viewerId}`),
      ]);

      const age = parseInt(candidateAge, 10);
      const minAge = prefMin ? parseInt(prefMin, 10) : 18;
      const maxAge = prefMax ? parseInt(prefMax, 10) : 99;

      if (age >= minAge && age <= maxAge) return this.WEIGHT_AGE;

      // Outside preferred range but close
      const diff = age < minAge ? minAge - age : age - maxAge;
      if (diff <= 3) return this.WEIGHT_AGE * 0.7;
      if (diff <= 5) return this.WEIGHT_AGE * 0.4;
      return this.WEIGHT_AGE * 0.1;
    } catch {
      return this.WEIGHT_AGE * 0.5;
    }
  }

  private calculateTagScore(
    viewerTags?: InterestTagDto[],
    candidateTags?: InterestTagDto[],
  ): number {
    if (!viewerTags?.length || !candidateTags?.length) {
      return this.WEIGHT_TAGS * 0.5;
    }

    const viewerTagIds = new Set(viewerTags.map((t) => t.id));
    const commonCount = candidateTags.filter((t) =>
      viewerTagIds.has(t.id),
    ).length;

    const maxPossible = Math.min(viewerTags.length, candidateTags.length);
    if (maxPossible === 0) return this.WEIGHT_TAGS * 0.5;

    const ratio = commonCount / maxPossible;
    return Math.round(this.WEIGHT_TAGS * Math.min(ratio * 1.5, 1) * 100) / 100;
  }

  private async calculateBehaviorScore(
    viewerId: string,
    candidateId: string,
  ): Promise<number> {
    try {
      // Get viewer's total swipe count to determine cold-start stage
      const swipeCount = await this.getUserSwipeCount(viewerId);

      // Get popularity score (always needed as fallback/blend component)
      const popularity = await this.getPopularityScore(candidateId);
      const normalizedPop = Math.min(popularity / 100, 1);
      const popScore = this.WEIGHT_BEHAVIOR * normalizedPop;

      // Cold start: < 20 swipes → 60% compat-based + 40% popularity
      // No ML data available yet, use popularity as the behavior signal
      if (swipeCount < this.COLD_START_THRESHOLD) {
        return Math.round(popScore * 100) / 100;
      }

      // Try ML service for personalized recommendations
      let mlScore: number | null = null;
      const recs = await this.mlClient.getRecommendations(viewerId, 50, []);
      if (recs) {
        const match = recs.find((r) => r.userId === candidateId);
        if (match) {
          mlScore = Math.min(match.score, 1);
        }
      }

      // Warm start: 20-50 swipes → linear transition from popularity to ML
      if (swipeCount < this.WARM_START_THRESHOLD) {
        if (mlScore === null) {
          return Math.round(popScore * 100) / 100;
        }
        // Linear blend: t goes from 0 (at 20 swipes) to 1 (at 50 swipes)
        const t = (swipeCount - this.COLD_START_THRESHOLD) /
          (this.WARM_START_THRESHOLD - this.COLD_START_THRESHOLD);
        const mlComponent = this.WEIGHT_BEHAVIOR * mlScore;
        const blended = (1 - t) * popScore + t * mlComponent;
        return Math.round(blended * 100) / 100;
      }

      // Hot start: > 50 swipes → 60% ML + 30% compat-based + 10% popularity
      if (mlScore !== null) {
        const mlComponent = this.WEIGHT_BEHAVIOR * mlScore * 0.6;
        const compatComponent = this.WEIGHT_BEHAVIOR * 0.5 * 0.3; // baseline compat
        const popComponent = popScore * 0.1;
        return Math.round((mlComponent + compatComponent + popComponent) * 100) / 100;
      }

      // ML unavailable, fallback to popularity
      return Math.round(popScore * 100) / 100;
    } catch {
      return this.WEIGHT_BEHAVIOR * 0.5;
    }
  }

  private async getUserSwipeCount(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Check today's count first (fast path)
      const todayCount = await this.redisService.get(
        `${this.SWIPE_COUNTER_PREFIX}${userId}:${today}`,
      );
      // Also check total swipes set size as a better measure
      const totalSwipes = await this.redisService.sCard(
        `user_swipes:${userId}`,
      );
      return totalSwipes || (todayCount ? parseInt(todayCount, 10) : 0);
    } catch {
      return 0;
    }
  }

  /**
   * Compute and cache popularity score for a user.
   * Based on 7-day rolling: likes + super_likes×3.
   * Called by a scheduled job or on-demand.
   */
  async computePopularityScore(userId: string): Promise<number> {
    try {
      const likesKey = `${this.LIKES_RECEIVED_PREFIX}${userId}`;
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Count likes received in last 7 days
      const recentLikeCount = await this.redisService.zCount(
        likesKey,
        sevenDaysAgo,
        '+inf',
      );

      // Simple scoring: each like = 1 point, cap at 100
      const score = Math.min(recentLikeCount, 100);

      // Cache the computed score
      await this.redisService.set(
        `${this.POPULARITY_PREFIX}${userId}`,
        String(score),
        604800, // 7 days TTL
      );

      return score;
    } catch {
      return 0;
    }
  }
}
