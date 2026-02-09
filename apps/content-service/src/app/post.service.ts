import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS } from '@suggar-daddy/common';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { CreatePostCommentDto } from './dto/post-comment.dto';
import { SubscriptionServiceClient } from './subscription-service.client';

const POST_KEY = (id: string) => `post:${id}`;
const POSTS_PUBLIC_IDS = 'posts:public:ids';
const POSTS_CREATOR = (creatorId: string) => `posts:creator:${creatorId}`;
const POST_LIKES = (postId: string) => `post:${postId}:likes`;
const POST_COMMENTS = (postId: string) => `post:${postId}:comments`;

@Injectable()
export class PostService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly subscriptionClient: SubscriptionServiceClient,
  ) {}

  private genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  async create(createDto: CreatePostDto): Promise<any> {
    const postId = this.genId('post');
    const now = new Date().toISOString();
    const post = {
      id: postId,
      creatorId: createDto.creatorId,
      contentType: createDto.contentType,
      caption: createDto.caption ?? null,
      mediaUrls: createDto.mediaUrls || [],
      visibility: createDto.visibility || 'public',
      requiredTierId: createDto.requiredTierId ?? null,
      ppvPrice: createDto.ppvPrice ?? null,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
    };
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    if ((createDto.visibility || 'public') === 'public') {
      await this.redis.lPush(POSTS_PUBLIC_IDS, postId);
    }
    await this.redis.lPush(POSTS_CREATOR(createDto.creatorId), postId);
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_CREATED, {
      postId,
      creatorId: createDto.creatorId,
      contentType: createDto.contentType,
      visibility: createDto.visibility || 'public',
      mediaUrls: createDto.mediaUrls || [],
      caption: createDto.caption,
      requiredTierId: createDto.requiredTierId,
      ppvPrice: createDto.ppvPrice,
    });
    return post;
  }

  async findAll(): Promise<any[]> {
    const ids = await this.redis.lRange(POSTS_PUBLIC_IDS, 0, 49);
    if (ids.length === 0) return [];
    const out: any[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(POST_KEY(id));
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  async findByCreator(creatorId: string): Promise<any[]> {
    const ids = await this.redis.lRange(POSTS_CREATOR(creatorId), 0, -1);
    const out: any[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(POST_KEY(id));
      if (raw) out.push(JSON.parse(raw));
    }
    return out.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  /** 依創作者取得貼文，並依 viewerId 過濾訂閱牆可見性（僅回傳 viewer 有權看到的） */
  async findByCreatorWithAccess(creatorId: string, viewerId?: string | null): Promise<any[]> {
    const all = await this.findByCreator(creatorId);
    if (!viewerId) {
      return all.filter((p) => p.visibility === 'public');
    }
    const result: any[] = [];
    for (const post of all) {
      if (post.visibility === 'public') {
        result.push(post);
        continue;
      }
      if (post.creatorId === viewerId) {
        result.push(post);
        continue;
      }
      if (post.visibility === 'subscribers') {
        const hasAccess = await this.subscriptionClient.hasActiveSubscription(viewerId, post.creatorId);
        if (hasAccess) result.push(post);
        continue;
      }
      if (post.visibility === 'tier_specific' && post.requiredTierId) {
        const hasAccess = await this.subscriptionClient.hasActiveSubscription(
          viewerId,
          post.creatorId,
          post.requiredTierId
        );
        if (hasAccess) result.push(post);
      }
    }
    return result.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  private readonly POST_UNLOCK = (postId: string, userId: string) =>
    `post:unlock:${postId}:${userId}`;

  async findOne(id: string): Promise<any> {
    const raw = await this.redis.get(POST_KEY(id));
    if (!raw) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return JSON.parse(raw);
  }

  /**
   * 取得貼文，依 viewerId 與付費/訂閱狀態決定是否回傳完整內容。
   * - 創作者本人：一律完整
   * - visibility subscribers：僅訂閱者可見，否則鎖定版
   * - visibility tier_specific：僅訂閱該方案者可見，否則鎖定版
   * - PPV：已購買則完整；未解鎖則鎖定版
   * - 無 viewerId 且 PPV/訂閱牆：回傳鎖定版
   */
  async findOneWithAccess(id: string, viewerId?: string | null): Promise<any> {
    const post = await this.findOne(id);
    const isPpv = post.ppvPrice != null && Number(post.ppvPrice) > 0;
    const stripLocked = () => ({
      ...post,
      locked: true,
      mediaUrls: [],
      caption: post.caption ? '(Purchase to view)' : null,
    });

    if (!viewerId) {
      if (isPpv) return stripLocked();
      if (post.visibility === 'subscribers' || post.visibility === 'tier_specific') return stripLocked();
      return post;
    }
    if (post.creatorId === viewerId) return post;

    if (post.visibility === 'subscribers') {
      const hasAccess = await this.subscriptionClient.hasActiveSubscription(viewerId, post.creatorId);
      if (!hasAccess) return stripLocked();
    } else if (post.visibility === 'tier_specific' && post.requiredTierId) {
      const hasAccess = await this.subscriptionClient.hasActiveSubscription(
        viewerId,
        post.creatorId,
        post.requiredTierId
      );
      if (!hasAccess) return stripLocked();
    }

    if (isPpv) {
      const unlocked = await this.redis.get(this.POST_UNLOCK(id, viewerId));
      if (!unlocked) return stripLocked();
    }
    return post;
  }

  async update(id: string, updateDto: UpdatePostDto): Promise<any> {
    const post = await this.findOne(id);
    if (updateDto.caption !== undefined) post.caption = updateDto.caption;
    if (updateDto.visibility !== undefined) post.visibility = updateDto.visibility;
    if (updateDto.requiredTierId !== undefined) post.requiredTierId = updateDto.requiredTierId;
    if (updateDto.ppvPrice !== undefined) post.ppvPrice = updateDto.ppvPrice;
    await this.redis.set(POST_KEY(id), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_UPDATED, {
      postId: id,
      ...updateDto,
      updatedAt: new Date().toISOString(),
    });
    return post;
  }

  async remove(id: string): Promise<void> {
    const post = await this.findOne(id);
    await this.redis.del(POST_KEY(id));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_DELETED, {
      postId: id,
      creatorId: post.creatorId,
      deletedAt: new Date().toISOString(),
    });
  }

  async likePost(postId: string, userId: string): Promise<any> {
    const post = await this.findOne(postId);
    const added = await this.redis.sAdd(POST_LIKES(postId), userId);
    if (added === 0) {
      throw new ConflictException('Already liked this post');
    }
    post.likeCount = (post.likeCount || 0) + 1;
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_LIKED, {
      postId,
      userId,
      likedAt: new Date().toISOString(),
    });
    return post;
  }

  async unlikePost(postId: string, userId: string): Promise<any> {
    const post = await this.findOne(postId);
    await this.redis.sRem(POST_LIKES(postId), userId);
    post.likeCount = Math.max(0, (post.likeCount || 1) - 1);
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_UNLIKED, {
      postId,
      userId,
      unlikedAt: new Date().toISOString(),
    });
    return post;
  }

  async createComment(postId: string, createDto: CreatePostCommentDto): Promise<any> {
    const post = await this.findOne(postId);
    const commentId = this.genId('comment');
    const now = new Date().toISOString();
    const comment = {
      id: commentId,
      postId,
      userId: createDto.userId,
      content: createDto.content,
      createdAt: now,
    };
    await this.redis.lPush(POST_COMMENTS(postId), JSON.stringify(comment));
    post.commentCount = (post.commentCount || 0) + 1;
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.COMMENT_CREATED, {
      postId,
      commentId,
      userId: createDto.userId,
      content: createDto.content,
      createdAt: now,
    });
    return comment;
  }

  async getComments(postId: string): Promise<any[]> {
    await this.findOne(postId);
    const list = await this.redis.lRange(POST_COMMENTS(postId), 0, -1);
    return list.map((s) => JSON.parse(s)).reverse();
  }
}
