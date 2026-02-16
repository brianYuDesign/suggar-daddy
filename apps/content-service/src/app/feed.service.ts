import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { InjectLogger } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { Post } from './post.service';

const FEED_KEY = (userId: string) => `feed:${userId}`;
const POST_KEY = (id: string) => `post:${id}`;
const USER_BLOCKS = (userId: string) => `user:blocks:${userId}`;
const USER_BLOCKED_BY = (userId: string) => `user:blocked-by:${userId}`;
const POSTS_CREATOR = (creatorId: string) => `posts:creator:${creatorId}`;
const MAX_FEED_SIZE = 1000;

@Injectable()
export class FeedService {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly redis: RedisService) {}

  private async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const ids = await this.redis.sUnion(USER_BLOCKS(userId), USER_BLOCKED_BY(userId));
    return new Set(ids);
  }

  async getFeed(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const total = await this.redis.zCard(FEED_KEY(userId));
    const skip = (page - 1) * limit;
    const postIds = await this.redis.zRevRange(FEED_KEY(userId), skip, skip + limit - 1);

    if (postIds.length === 0) {
      return { data: [], total, page, limit };
    }

    const keys = postIds.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);
    let posts: Post[] = values.filter(Boolean).map((raw) => JSON.parse(raw!));

    // Filter blocked users
    const blocked = await this.getBlockedUserIds(userId);
    if (blocked.size > 0) {
      posts = posts.filter((p) => !blocked.has(p.creatorId));
    }

    // Filter locked content — only show public posts and posts by the user
    posts = posts.filter(
      (p) => p.visibility === 'public' || p.creatorId === userId
    );

    return { data: posts, total, page, limit };
  }

  async addToFeed(userId: string, postId: string, timestamp: number): Promise<void> {
    await this.redis.zAdd(FEED_KEY(userId), timestamp, postId);
    // Trim feed to max size (remove oldest entries beyond limit)
    const size = await this.redis.zCard(FEED_KEY(userId));
    if (size > MAX_FEED_SIZE) {
      await this.redis.zRemRangeByRank(FEED_KEY(userId), 0, size - MAX_FEED_SIZE - 1);
    }
  }

  async backfillFeed(userId: string, creatorId: string): Promise<void> {
    // Get last 20 posts from the creator
    const postIds = await this.redis.lRange(POSTS_CREATOR(creatorId), 0, 19);
    if (postIds.length === 0) return;

    const keys = postIds.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);

    for (const raw of values) {
      if (!raw) continue;
      const post: Post = JSON.parse(raw);
      if (post.visibility === 'public') {
        await this.redis.zAdd(FEED_KEY(userId), new Date(post.createdAt).getTime(), post.id);
      }
    }

    // Trim
    const size = await this.redis.zCard(FEED_KEY(userId));
    if (size > MAX_FEED_SIZE) {
      await this.redis.zRemRangeByRank(FEED_KEY(userId), 0, size - MAX_FEED_SIZE - 1);
    }

    this.logger.debug(`Backfilled feed for user=${userId} from creator=${creatorId}, ${postIds.length} posts`);
  }
}
