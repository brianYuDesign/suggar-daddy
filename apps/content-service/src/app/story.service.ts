import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS } from '@suggar-daddy/common';
import { CreateStoryDto, StoryDto, PaginatedResponse } from '@suggar-daddy/dto';

const STORY_KEY = (storyId: string) => `story:${storyId}`;
const STORIES_CREATOR = (creatorId: string) => `stories:creator:${creatorId}`;
const STORY_VIEWERS = (storyId: string) => `story:${storyId}:viewers`;
const STORIES_FEED = (userId: string) => `stories:feed:${userId}`;
const USER_FOLLOWERS = (userId: string) => `user:followers:${userId}`;

const STORY_TTL_SEC = 24 * 60 * 60; // 24 hours

@Injectable()
export class StoryService {
  private readonly logger = new Logger(StoryService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  private genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async createStory(creatorId: string, dto: CreateStoryDto): Promise<StoryDto> {
    const storyId = this.genId('story');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + STORY_TTL_SEC * 1000);

    const story: StoryDto = {
      id: storyId,
      creatorId,
      contentType: dto.contentType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption || null,
      viewCount: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };

    // Store with 24h TTL
    await this.redis.set(STORY_KEY(storyId), JSON.stringify(story), STORY_TTL_SEC);
    // Push to creator's story list
    await this.redis.lPush(STORIES_CREATOR(creatorId), storyId);
    await this.redis.expire(STORIES_CREATOR(creatorId), STORY_TTL_SEC + 3600); // extra 1h buffer

    // Update feed for followers
    const followers = await this.redis.sMembers(USER_FOLLOWERS(creatorId));
    const timestamp = now.getTime();
    for (const followerId of followers) {
      await this.redis.zAdd(STORIES_FEED(followerId), timestamp, creatorId);
      await this.redis.expire(STORIES_FEED(followerId), STORY_TTL_SEC + 3600);
    }

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.STORY_CREATED, {
      storyId,
      creatorId,
      contentType: dto.contentType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    });

    return story;
  }

  async getStoryFeed(userId: string): Promise<{ creatorId: string; latestStoryAt: string }[]> {
    const creatorIds = await this.redis.zRevRange(STORIES_FEED(userId), 0, -1);
    if (creatorIds.length === 0) return [];

    const result: { creatorId: string; latestStoryAt: string }[] = [];

    for (const creatorId of creatorIds) {
      // Check if creator still has active stories
      const storyIds = await this.redis.lRange(STORIES_CREATOR(creatorId), 0, 0);
      if (storyIds.length === 0) {
        // Lazy cleanup: remove from feed
        await this.redis.zRem(STORIES_FEED(userId), creatorId);
        continue;
      }
      // Check if the first story still exists (not expired)
      const exists = await this.redis.exists(STORY_KEY(storyIds[0]));
      if (!exists) {
        await this.redis.zRem(STORIES_FEED(userId), creatorId);
        continue;
      }

      const score = await this.redis.zScore(STORIES_FEED(userId), creatorId);
      result.push({
        creatorId,
        latestStoryAt: score ? new Date(score).toISOString() : new Date().toISOString(),
      });
    }

    return result;
  }

  async getCreatorStories(
    creatorId: string,
    viewerId?: string,
  ): Promise<StoryDto[]> {
    const storyIds = await this.redis.lRange(STORIES_CREATOR(creatorId), 0, -1);
    if (storyIds.length === 0) return [];

    const keys = storyIds.map((id) => STORY_KEY(id));
    const values = await this.redis.mget(...keys);

    const stories: StoryDto[] = [];
    const expiredIds: string[] = [];

    for (let i = 0; i < storyIds.length; i++) {
      const raw = values[i];
      if (!raw) {
        // Story expired — mark for cleanup
        expiredIds.push(storyIds[i]);
        continue;
      }
      const story: StoryDto = JSON.parse(raw);

      // Mark viewed status for viewer
      if (viewerId) {
        const viewed = await this.redis.sIsMember(STORY_VIEWERS(storyIds[i]), viewerId);
        story.viewed = viewed;
      }

      stories.push(story);
    }

    // Lazy cleanup expired story IDs from creator list
    for (const expiredId of expiredIds) {
      await this.redis.lRem(STORIES_CREATOR(creatorId), 1, expiredId);
    }

    return stories;
  }

  async viewStory(storyId: string, viewerId: string): Promise<StoryDto> {
    const raw = await this.redis.get(STORY_KEY(storyId));
    if (!raw) {
      throw new NotFoundException('Story not found or expired');
    }
    const story: StoryDto = JSON.parse(raw);

    // Add viewer and increment count
    const added = await this.redis.sAdd(STORY_VIEWERS(storyId), viewerId);
    if (added > 0) {
      story.viewCount = (story.viewCount || 0) + 1;
      await this.redis.set(STORY_KEY(storyId), JSON.stringify(story), STORY_TTL_SEC);
      await this.redis.expire(STORY_VIEWERS(storyId), STORY_TTL_SEC);
    }

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.STORY_VIEWED, {
      storyId,
      viewerId,
      creatorId: story.creatorId,
      viewedAt: new Date().toISOString(),
    });

    return { ...story, viewed: true };
  }

  async getStoryViewers(
    storyId: string,
    creatorId: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResponse<{ viewerId: string }>> {
    const raw = await this.redis.get(STORY_KEY(storyId));
    if (!raw) {
      throw new NotFoundException('Story not found or expired');
    }
    const story: StoryDto = JSON.parse(raw);

    // Only the creator can see viewers
    if (story.creatorId !== creatorId) {
      throw new ForbiddenException('Only the story creator can view story viewers');
    }

    const viewerIds = await this.redis.sMembers(STORY_VIEWERS(storyId));
    const total = viewerIds.length;
    const skip = (page - 1) * limit;
    const paged = viewerIds.slice(skip, skip + limit);

    return {
      data: paged.map((viewerId) => ({ viewerId })),
      total,
      page,
      limit,
    };
  }

  async deleteStory(storyId: string, creatorId: string): Promise<void> {
    const raw = await this.redis.get(STORY_KEY(storyId));
    if (!raw) {
      throw new NotFoundException('Story not found or expired');
    }
    const story: StoryDto = JSON.parse(raw);

    if (story.creatorId !== creatorId) {
      throw new ForbiddenException('Only the story creator can delete this story');
    }

    await this.redis.del(STORY_KEY(storyId));
    await this.redis.del(STORY_VIEWERS(storyId));
    await this.redis.lRem(STORIES_CREATOR(creatorId), 1, storyId);

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.STORY_DELETED, {
      storyId,
      creatorId,
      deletedAt: new Date().toISOString(),
    });
  }
}
