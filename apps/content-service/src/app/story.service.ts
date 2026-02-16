import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS, InjectLogger } from '@suggar-daddy/common';
import { CreateStoryDto, StoryDto, PaginatedResponse } from '@suggar-daddy/dto';

const STORY_KEY = (storyId: string) => `story:${storyId}`;
const STORIES_CREATOR = (creatorId: string) => `stories:creator:${creatorId}`;
const STORY_VIEWERS = (storyId: string) => `story:${storyId}:viewers`;
const STORIES_FEED = (userId: string) => `stories:feed:${userId}`;
const USER_FOLLOWERS = (userId: string) => `user:followers:${userId}`;

const STORY_TTL_SEC = 24 * 60 * 60; // 24 hours

@Injectable()
export class StoryService {
  @InjectLogger() private readonly logger!: Logger;

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
    // Use zRevRangeWithScores to get scores in one call (eliminates N zScore calls)
    const entries = await this.redis.zRevRangeWithScores(STORIES_FEED(userId), 0, -1);
    if (entries.length === 0) return [];

    const creatorIds = entries.map((e) => e.member);

    // Batch lRange: get first story ID for each creator (1 pipeline instead of N calls)
    const lRangeResults = await this.redis.batchLRange(
      creatorIds.map((id) => ({ key: STORIES_CREATOR(id), start: 0, stop: 0 })),
    );

    // Batch exists: check if first story still exists (1 pipeline instead of N calls)
    const storyKeysToCheck: string[] = [];
    const storyCheckMap: number[] = []; // maps storyKeysToCheck index -> creatorIds index
    for (let i = 0; i < lRangeResults.length; i++) {
      if (lRangeResults[i].length > 0) {
        storyKeysToCheck.push(STORY_KEY(lRangeResults[i][0]));
        storyCheckMap.push(i);
      }
    }
    const existsResults = await this.redis.batchExists(storyKeysToCheck);

    // Determine which creators to keep and which to clean up
    const toRemove: string[] = [];
    const validSet = new Set<number>();

    for (let i = 0; i < creatorIds.length; i++) {
      if (lRangeResults[i].length === 0) {
        toRemove.push(creatorIds[i]);
        continue;
      }
      const checkIdx = storyCheckMap.indexOf(i);
      if (checkIdx === -1 || !existsResults[checkIdx]) {
        toRemove.push(creatorIds[i]);
        continue;
      }
      validSet.add(i);
    }

    // Batch cleanup removed creators
    if (toRemove.length > 0) {
      await this.redis.batchZRem(STORIES_FEED(userId), toRemove);
    }

    // Build result from valid entries (scores already available)
    const result: { creatorId: string; latestStoryAt: string }[] = [];
    for (let i = 0; i < entries.length; i++) {
      if (!validSet.has(i)) continue;
      result.push({
        creatorId: entries[i].member,
        latestStoryAt: entries[i].score
          ? new Date(entries[i].score).toISOString()
          : new Date().toISOString(),
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
    const validIndices: number[] = [];

    for (let i = 0; i < storyIds.length; i++) {
      if (!values[i]) {
        expiredIds.push(storyIds[i]);
      } else {
        validIndices.push(i);
      }
    }

    // Batch check viewed status with pipeline (eliminates N+1)
    let viewedResults: boolean[] = [];
    if (viewerId && validIndices.length > 0) {
      viewedResults = await this.redis.batchSIsMember(
        validIndices.map((i) => ({ key: STORY_VIEWERS(storyIds[i]), member: viewerId })),
      );
    }

    for (let j = 0; j < validIndices.length; j++) {
      const story: StoryDto = JSON.parse(values[validIndices[j]]!);
      if (viewerId) {
        story.viewed = viewedResults[j] ?? false;
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
