import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { CONTENT_EVENTS } from '@suggar-daddy/common';
import { PaginatedResponse } from '@suggar-daddy/dto';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { CreatePostCommentDto } from './dto/post-comment.dto';
import { SubscriptionServiceClient } from './subscription-service.client';

const POST_KEY = (id: string) => `post:${id}`;
const POSTS_PUBLIC_IDS = 'posts:public:ids';
const POSTS_CREATOR = (creatorId: string) => `posts:creator:${creatorId}`;
const POST_LIKES = (postId: string) => `post:${postId}:likes`;
const POST_COMMENTS = (postId: string) => `post:${postId}:comments`;

export interface VideoMeta {
  mediaId: string;
  s3Key: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  duration: number | null;
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
}

export interface Post {
  id: string;
  creatorId: string;
  contentType: 'image' | 'video' | 'text';
  caption: string | null;
  mediaUrls: string[];
  visibility: 'public' | 'subscribers' | 'tier_specific' | 'ppv' | 'hidden';
  requiredTierId: string | null;
  ppvPrice: number | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
  moderationStatus?: string;
  moderationActionBy?: string;
  moderationActionAt?: string;
  videoMeta?: VideoMeta;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

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

  async create(createDto: CreatePostDto): Promise<Post> {
    const postId = this.genId('post');
    const now = new Date().toISOString();
    const post: Post = {
      id: postId,
      creatorId: createDto.creatorId,
      contentType: createDto.contentType as Post['contentType'],
      caption: createDto.caption ?? null,
      mediaUrls: createDto.mediaUrls || [],
      visibility: (createDto.visibility || 'public') as Post['visibility'],
      requiredTierId: createDto.requiredTierId ?? null,
      ppvPrice: createDto.ppvPrice ?? null,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      videoMeta: createDto.videoMeta
        ? {
            mediaId: createDto.videoMeta.mediaId,
            s3Key: createDto.videoMeta.s3Key,
            thumbnailUrl: createDto.videoMeta.thumbnailUrl ?? null,
            previewUrl: createDto.videoMeta.previewUrl ?? null,
            duration: createDto.videoMeta.duration ?? null,
            processingStatus: 'pending',
          }
        : undefined,
    };
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    if ((createDto.visibility || 'public') === 'public') {
      await this.redis.lPush(POSTS_PUBLIC_IDS, postId);
    }
    await this.redis.lPush(POSTS_CREATOR(createDto.creatorId), postId);
    // Create reverse index for media → post lookup (used by video processed consumer)
    if (post.videoMeta?.mediaId) {
      await this.redis.set(`media:post:${post.videoMeta.mediaId}`, postId);
    }
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

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const total = await this.redis.lLen(POSTS_PUBLIC_IDS);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(POSTS_PUBLIC_IDS, skip, skip + limit - 1);
    const keys = ids.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  async findByCreator(creatorId: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const key = POSTS_CREATOR(creatorId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(key, skip, skip + limit - 1);
    const keys = ids.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);
    const data = values.filter(Boolean).map((raw) => JSON.parse(raw!));
    return { data: data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)), total, page, limit };
  }

  /** 依創作者取得貼文，並依 viewerId 過濾訂閱牆可見性（僅回傳 viewer 有權看到的） */
  async findByCreatorWithAccess(
    creatorId: string,
    viewerId?: string | null,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Post>> {
    // Must fetch all then filter — access check can't be done at Redis level
    const ids = await this.redis.lRange(POSTS_CREATOR(creatorId), 0, -1);
    const postKeys = ids.map((id) => POST_KEY(id));
    const postValues = await this.redis.mget(...postKeys);
    const allPosts = postValues.filter(Boolean).map((raw) => JSON.parse(raw!));

    // Pre-compute subscription access once (all posts belong to same creator)
    let hasBaseSubscription = false;
    const tierAccessCache = new Map<string, boolean>();

    if (viewerId && viewerId !== creatorId) {
      // Single HTTP call to check base subscription
      hasBaseSubscription = await this.subscriptionClient.hasActiveSubscription(viewerId, creatorId);

      // Collect unique tier IDs needed and check them
      const uniqueTierIds = [
        ...new Set(
          allPosts
            .filter((p) => p.visibility === 'tier_specific' && p.requiredTierId)
            .map((p) => p.requiredTierId as string)
        ),
      ];
      // Check tier-specific access in parallel
      const tierChecks = await Promise.all(
        uniqueTierIds.map((tierId) =>
          this.subscriptionClient.hasActiveSubscription(viewerId, creatorId, tierId)
        )
      );
      uniqueTierIds.forEach((tierId, i) => tierAccessCache.set(tierId, tierChecks[i]));
    }

    const filtered: Post[] = [];
    for (const post of allPosts) {
      if (!viewerId) {
        if (post.visibility === 'public') filtered.push(post);
        continue;
      }
      if (post.visibility === 'public') {
        filtered.push(post);
        continue;
      }
      if (post.creatorId === viewerId) {
        filtered.push(post);
        continue;
      }
      if (post.visibility === 'subscribers') {
        if (hasBaseSubscription) filtered.push(post);
        continue;
      }
      if (post.visibility === 'tier_specific' && post.requiredTierId) {
        if (tierAccessCache.get(post.requiredTierId)) filtered.push(post);
      }
    }

    filtered.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const skip = (page - 1) * limit;
    return { data: filtered.slice(skip, skip + limit), total: filtered.length, page, limit };
  }

  private readonly POST_UNLOCK = (postId: string, userId: string) =>
    `post:unlock:${postId}:${userId}`;

  async findOne(id: string): Promise<Post> {
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
  async findOneWithAccess(id: string, viewerId?: string | null): Promise<Post & { locked?: boolean }> {
    const post = await this.findOne(id);
    const isPpv = post.ppvPrice != null && Number(post.ppvPrice) > 0;
    const stripLocked = (): Post & { locked: boolean } => ({
      ...post,
      locked: true,
      mediaUrls: [],
      caption: post.caption ? '(Purchase to view)' : null,
      // For video posts: expose preview info even when locked (hide s3Key/mediaId)
      videoMeta: post.videoMeta
        ? {
            mediaId: '',
            s3Key: '',
            thumbnailUrl: post.videoMeta.thumbnailUrl,
            previewUrl: post.videoMeta.previewUrl,
            duration: post.videoMeta.duration,
            processingStatus: post.videoMeta.processingStatus,
          }
        : undefined,
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

  async update(id: string, updateDto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    if (updateDto.caption !== undefined) post.caption = updateDto.caption;
    if (updateDto.visibility !== undefined) post.visibility = updateDto.visibility as Post['visibility'];
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

  async likePost(postId: string, userId: string): Promise<Post> {
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

  async unlikePost(postId: string, userId: string): Promise<Post> {
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

  async createComment(postId: string, createDto: CreatePostCommentDto): Promise<PostComment> {
    const post = await this.findOne(postId);
    const commentId = this.genId('comment');
    const now = new Date().toISOString();
    const comment: PostComment = {
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

  async getComments(postId: string, page = 1, limit = 20): Promise<PaginatedResponse<PostComment>> {
    await this.findOne(postId);
    const key = POST_COMMENTS(postId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const list = await this.redis.lRange(key, skip, skip + limit - 1);
    return { data: list.map((s) => JSON.parse(s)).reverse(), total, page, limit };
  }
}
