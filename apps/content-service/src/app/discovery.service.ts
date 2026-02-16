import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { InjectLogger } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { Post } from './post.service';

const TRENDING_POSTS = 'trending:posts';
const POST_KEY = (id: string) => `post:${id}`;
const POSTS_PUBLIC_IDS = 'posts:public:ids';

// Engagement score weights
const SCORE_LIKE = 1;
const SCORE_COMMENT = 2;
const SCORE_BOOKMARK = 3;

@Injectable()
export class DiscoveryService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly redis: RedisService) {}

  async getTrendingPosts(page = 1, limit = 20): Promise<PaginatedResponse<Post & { engagementScore?: number }>> {
    const total = await this.redis.zCard(TRENDING_POSTS);
    const skip = (page - 1) * limit;
    // Use zRevRangeWithScores to get both members and scores in 1 call (eliminates N+1 zScore)
    const entries = await this.redis.zRevRangeWithScores(TRENDING_POSTS, skip, skip + limit - 1);

    if (entries.length === 0) {
      return { data: [], total, page, limit };
    }

    const postIds = entries.map((e) => e.member);
    const keys = postIds.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);

    const posts: (Post & { engagementScore?: number })[] = [];
    for (let i = 0; i < entries.length; i++) {
      const raw = values[i];
      if (!raw) continue;
      const post: Post = JSON.parse(raw);
      if (post.visibility !== 'public') continue;
      posts.push({ ...post, engagementScore: entries[i].score ?? 0 });
    }

    return { data: posts, total, page, limit };
  }

  async searchPosts(query: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    if (!query || query.trim().length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const lowerQuery = query.toLowerCase();
    const totalIds = await this.redis.lLen(POSTS_PUBLIC_IDS);
    if (totalIds === 0) {
      return { data: [], total: 0, page, limit };
    }

    // Process in batches to avoid loading all posts at once
    const BATCH_SIZE = 200;
    const matching: Post[] = [];
    const targetCount = (page * limit) + limit; // fetch enough for pagination

    for (let offset = 0; offset < totalIds; offset += BATCH_SIZE) {
      const batchIds = await this.redis.lRange(POSTS_PUBLIC_IDS, offset, offset + BATCH_SIZE - 1);
      if (batchIds.length === 0) break;

      const keys = batchIds.map((id) => POST_KEY(id));
      const values = await this.redis.mget(...keys);

      for (const raw of values) {
        if (!raw) continue;
        const post: Post = JSON.parse(raw);
        if (post.visibility !== 'public') continue;
        if (post.caption && post.caption.toLowerCase().includes(lowerQuery)) {
          matching.push(post);
        }
      }

      // Early exit if we have enough results for the requested page
      if (matching.length >= targetCount) break;
    }

    // Sort by most recent
    matching.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const skip = (page - 1) * limit;
    return {
      data: matching.slice(skip, skip + limit),
      total: matching.length,
      page,
      limit,
    };
  }

  async updateTrendingScore(
    postId: string,
    incrementType: 'like' | 'comment' | 'bookmark',
  ): Promise<void> {
    let delta = 0;
    switch (incrementType) {
      case 'like':
        delta = SCORE_LIKE;
        break;
      case 'comment':
        delta = SCORE_COMMENT;
        break;
      case 'bookmark':
        delta = SCORE_BOOKMARK;
        break;
    }
    await this.redis.zIncrBy(TRENDING_POSTS, delta, postId);
    this.logger.debug(`Updated trending score for post=${postId} type=${incrementType} delta=${delta}`);
  }

  /** Remove posts older than 7 days from trending */
  async cleanupOldTrending(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Get all trending post IDs and check their creation dates
    const postIds = await this.redis.zRevRange(TRENDING_POSTS, 0, -1);
    if (postIds.length === 0) return;

    const keys = postIds.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);

    const toRemove: string[] = [];
    for (let i = 0; i < postIds.length; i++) {
      const raw = values[i];
      if (!raw) {
        toRemove.push(postIds[i]);
        continue;
      }
      const post: Post = JSON.parse(raw);
      if (new Date(post.createdAt).getTime() < sevenDaysAgo) {
        toRemove.push(postIds[i]);
      }
    }

    if (toRemove.length > 0) {
      await this.redis.zRem(TRENDING_POSTS, ...toRemove);
      this.logger.debug(`Cleaned up ${toRemove.length} old trending posts`);
    }
  }
}
