import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
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
const COMMENT_KEY = (commentId: string) => `comment:${commentId}`;
const COMMENT_REPLIES = (commentId: string) => `comment:${commentId}:replies`;
const USER_BOOKMARKS = (userId: string) => `user:bookmarks:${userId}`;
const USER_BLOCKS = (userId: string) => `user:blocks:${userId}`;
const USER_BLOCKED_BY = (userId: string) => `user:blocked-by:${userId}`;

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
  bookmarkCount: number;
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
  parentCommentId: string | null;
  replyCount: number;
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

  // ── Block integration helpers ─────────────────────────────────

  /** Get the union of user:blocks:{userId} and user:blocked-by:{userId} */
  private async getBlockedUserIds(userId: string): Promise<Set<string>> {
    const ids = await this.redis.sUnion(USER_BLOCKS(userId), USER_BLOCKED_BY(userId));
    return new Set(ids);
  }

  // ── Post CRUD ─────────────────────────────────────────────────

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
      bookmarkCount: 0,
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
    // Create reverse index for media -> post lookup (used by video processed consumer)
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

  async findAll(page = 1, limit = 20, currentUserId?: string): Promise<PaginatedResponse<Post>> {
    const total = await this.redis.lLen(POSTS_PUBLIC_IDS);
    const skip = (page - 1) * limit;
    const ids = await this.redis.lRange(POSTS_PUBLIC_IDS, skip, skip + limit - 1);
    const keys = ids.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);
    let data: Post[] = values.filter(Boolean).map((raw) => JSON.parse(raw!));

    // Filter out blocked users' posts
    if (currentUserId) {
      const blocked = await this.getBlockedUserIds(currentUserId);
      if (blocked.size > 0) {
        data = data.filter((p) => !blocked.has(p.creatorId));
      }
    }

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

  /** Get posts by creator with subscription access control */
  async findByCreatorWithAccess(
    creatorId: string,
    viewerId?: string | null,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Post>> {
    const ids = await this.redis.lRange(POSTS_CREATOR(creatorId), 0, -1);
    const postKeys = ids.map((id) => POST_KEY(id));
    const postValues = await this.redis.mget(...postKeys);
    const allPosts = postValues.filter(Boolean).map((raw) => JSON.parse(raw!));

    let hasBaseSubscription = false;
    const tierAccessCache = new Map<string, boolean>();

    if (viewerId && viewerId !== creatorId) {
      // ✅ 優化：批量檢查所有訂閱狀態，避免多次 RPC 調用
      const uniqueTierIds = [
        ...new Set(
          allPosts
            .filter((p) => p.visibility === 'tier_specific' && p.requiredTierId)
            .map((p) => p.requiredTierId as string)
        ),
      ];

      // 檢查基本訂閱和所有 tier 訂閱（並行執行）
      const subscriptionChecks = await Promise.all([
        this.subscriptionClient.hasActiveSubscription(viewerId, creatorId),
        ...uniqueTierIds.map((tierId) =>
          this.subscriptionClient.hasActiveSubscription(viewerId, creatorId, tierId)
        ),
      ]);

      // 第一個結果是基本訂閱，其餘是 tier 訂閱
      hasBaseSubscription = subscriptionChecks[0];
      uniqueTierIds.forEach((tierId, i) => {
        tierAccessCache.set(tierId, subscriptionChecks[i + 1]);
      });
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

  async findOneWithAccess(id: string, viewerId?: string | null): Promise<Post & { locked?: boolean }> {
    const post = await this.findOne(id);
    const isPpv = post.ppvPrice != null && Number(post.ppvPrice) > 0;
    const stripLocked = (): Post & { locked: boolean } => ({
      ...post,
      locked: true,
      mediaUrls: [],
      caption: post.caption ? '(Purchase to view)' : null,
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

  // ── Likes ─────────────────────────────────────────────────────

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
    // ✅ Bug 3 修復: 使用 ?? 而非 || 避免 0 被視為 falsy
    post.likeCount = Math.max(0, (post.likeCount ?? 0) - 1);
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_UNLIKED, {
      postId,
      userId,
      unlikedAt: new Date().toISOString(),
    });
    return post;
  }

  // ── Bookmarks ─────────────────────────────────────────────────

  async bookmarkPost(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const post = await this.findOne(postId);
    const score = await this.redis.zScore(USER_BOOKMARKS(userId), postId);
    if (score !== null) {
      throw new ConflictException('Already bookmarked this post');
    }
    await this.redis.zAdd(USER_BOOKMARKS(userId), Date.now(), postId);
    post.bookmarkCount = (post.bookmarkCount || 0) + 1;
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_BOOKMARKED, {
      postId,
      userId,
      bookmarkedAt: new Date().toISOString(),
    });
    return { bookmarked: true };
  }

  async unbookmarkPost(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const post = await this.findOne(postId);
    const removed = await this.redis.zRem(USER_BOOKMARKS(userId), postId);
    if (removed === 0) {
      throw new NotFoundException('Bookmark not found');
    }
    // ✅ Bug 3 修復: 使用 ?? 而非 || 避免 0 被視為 falsy
    post.bookmarkCount = Math.max(0, (post.bookmarkCount ?? 0) - 1);
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));
    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.POST_UNBOOKMARKED, {
      postId,
      userId,
      unbookmarkedAt: new Date().toISOString(),
    });
    return { bookmarked: false };
  }

  async getBookmarks(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<Post>> {
    const total = await this.redis.zCard(USER_BOOKMARKS(userId));
    const skip = (page - 1) * limit;
    const ids = await this.redis.zRevRange(USER_BOOKMARKS(userId), skip, skip + limit - 1);
    if (ids.length === 0) {
      return { data: [], total, page, limit };
    }
    const keys = ids.map((id) => POST_KEY(id));
    const values = await this.redis.mget(...keys);
    const data: Post[] = values
      .filter(Boolean)
      .map((raw) => JSON.parse(raw!))
      .filter((p) => p.visibility === 'public' || p.creatorId === userId);
    return { data, total, page, limit };
  }

  // ── Comments (enhanced with nesting) ──────────────────────────

  async createComment(postId: string, createDto: CreatePostCommentDto): Promise<PostComment> {
    const post = await this.findOne(postId);
    const commentId = this.genId('comment');
    const now = new Date().toISOString();
    const parentCommentId = createDto.parentCommentId || null;

    const comment: PostComment = {
      id: commentId,
      postId,
      userId: createDto.userId,
      content: createDto.content,
      parentCommentId,
      replyCount: 0,
      createdAt: now,
    };

    // Store comment JSON at its own key
    await this.redis.set(COMMENT_KEY(commentId), JSON.stringify(comment));

    if (parentCommentId) {
      // It's a reply: push to parent's reply list, increment parent replyCount
      await this.redis.rPush(COMMENT_REPLIES(parentCommentId), commentId);
      const parentRaw = await this.redis.get(COMMENT_KEY(parentCommentId));
      if (parentRaw) {
        const parent: PostComment = JSON.parse(parentRaw);
        parent.replyCount = (parent.replyCount || 0) + 1;
        await this.redis.set(COMMENT_KEY(parentCommentId), JSON.stringify(parent));
      }
    } else {
      // Top-level comment
      await this.redis.rPush(POST_COMMENTS(postId), commentId);
    }

    // Increment post comment count
    post.commentCount = (post.commentCount || 0) + 1;
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.COMMENT_CREATED, {
      postId,
      commentId,
      userId: createDto.userId,
      content: createDto.content,
      parentCommentId,
      createdAt: now,
    });
    return comment;
  }

  async deleteComment(postId: string, commentId: string, requesterId: string): Promise<void> {
    const post = await this.findOne(postId);
    const commentRaw = await this.redis.get(COMMENT_KEY(commentId));
    if (!commentRaw) {
      throw new NotFoundException('Comment not found');
    }
    const comment: PostComment = JSON.parse(commentRaw);

    // Permission check: comment author or post creator
    if (comment.userId !== requesterId && post.creatorId !== requesterId) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    // Remove from parent list
    if (comment.parentCommentId) {
      await this.redis.lRem(COMMENT_REPLIES(comment.parentCommentId), 1, commentId);
      // Decrement parent replyCount
      const parentRaw = await this.redis.get(COMMENT_KEY(comment.parentCommentId));
      if (parentRaw) {
        const parent: PostComment = JSON.parse(parentRaw);
        // ✅ Bug 3 修復: 使用 ?? 而非 || 避免 0 被視為 falsy
        parent.replyCount = Math.max(0, (parent.replyCount ?? 0) - 1);
        await this.redis.set(COMMENT_KEY(comment.parentCommentId), JSON.stringify(parent));
      }
    } else {
      await this.redis.lRem(POST_COMMENTS(postId), 1, commentId);
    }

    // Delete the comment key
    await this.redis.del(COMMENT_KEY(commentId));

    // Decrement post comment count - ✅ Bug 3 修復
    post.commentCount = Math.max(0, (post.commentCount ?? 0) - 1);
    await this.redis.set(POST_KEY(postId), JSON.stringify(post));

    await this.kafkaProducer.sendEvent(CONTENT_EVENTS.COMMENT_DELETED, {
      postId,
      commentId,
      deletedBy: requesterId,
      deletedAt: new Date().toISOString(),
    });
  }

  async getComments(postId: string, page = 1, limit = 20, currentUserId?: string): Promise<PaginatedResponse<PostComment>> {
    await this.findOne(postId);
    const key = POST_COMMENTS(postId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const items = await this.redis.lRange(key, skip, skip + limit - 1);

    // Load comments - handle both new format (comment ID strings) and old format (JSON strings)
    const comments: PostComment[] = [];
    const commentIds: string[] = [];

    for (const item of items) {
      // Try to detect if item is a JSON string (old format) or a comment ID (new format)
      if (item.startsWith('{')) {
        // Old format: direct JSON
        try {
          const parsed = JSON.parse(item);
          comments.push({
            ...parsed,
            parentCommentId: parsed.parentCommentId || null,
            replyCount: parsed.replyCount || 0,
          });
        } catch {
          // Malformed, skip
        }
      } else {
        commentIds.push(item);
      }
    }

    // Batch load new-format comment IDs
    if (commentIds.length > 0) {
      const keys = commentIds.map((id) => COMMENT_KEY(id));
      const values = await this.redis.mget(...keys);
      for (const raw of values) {
        if (raw) {
          comments.push(JSON.parse(raw));
        }
      }
    }

    // Filter blocked users if current user
    let filtered = comments;
    if (currentUserId) {
      const blocked = await this.getBlockedUserIds(currentUserId);
      if (blocked.size > 0) {
        filtered = comments.filter((c) => !blocked.has(c.userId));
      }
    }

    return { data: filtered, total, page, limit };
  }

  async getCommentReplies(
    postId: string,
    commentId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<PostComment>> {
    await this.findOne(postId); // verify post exists
    const key = COMMENT_REPLIES(commentId);
    const total = await this.redis.lLen(key);
    const skip = (page - 1) * limit;
    const replyIds = await this.redis.lRange(key, skip, skip + limit - 1);

    if (replyIds.length === 0) {
      return { data: [], total, page, limit };
    }

    const keys = replyIds.map((id) => COMMENT_KEY(id));
    const values = await this.redis.mget(...keys);
    const data: PostComment[] = values.filter(Boolean).map((raw) => JSON.parse(raw!));

    return { data, total, page, limit };
  }
}
