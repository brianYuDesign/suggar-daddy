import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@suggar-daddy/redis';
import {
  UserEntity,
  PostEntity,
  PostLikeEntity,
  PostCommentEntity,
  MediaFileEntity,
  SubscriptionEntity,
  SubscriptionTierEntity,
  TransactionEntity,
  TipEntity,
  PostPurchaseEntity,
} from '@suggar-daddy/database';

const USER_KEY = (id: string) => `user:${id}`;
const USER_EMAIL_KEY = (email: string) => `user:email:${email}`;
const POST_KEY = (id: string) => `post:${id}`;
const POSTS_PUBLIC_IDS = 'posts:public:ids';
const POSTS_CREATOR_PREFIX = (creatorId: string) => `posts:creator:${creatorId}`;
const MEDIA_KEY = (id: string) => `media:${id}`;

@Injectable()
export class DbWriterService {
  private readonly logger = new Logger(DbWriterService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    @InjectRepository(PostLikeEntity)
    private readonly postLikeRepo: Repository<PostLikeEntity>,
    @InjectRepository(PostCommentEntity)
    private readonly postCommentRepo: Repository<PostCommentEntity>,
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepo: Repository<MediaFileEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionTierEntity)
    private readonly tierRepo: Repository<SubscriptionTierEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(TipEntity)
    private readonly tipRepo: Repository<TipEntity>,
    @InjectRepository(PostPurchaseEntity)
    private readonly postPurchaseRepo: Repository<PostPurchaseEntity>,
    private readonly redis: RedisService,
  ) {}

  async handleUserCreated(payload: any): Promise<void> {
    const { id, email, passwordHash, displayName, role, bio, createdAt } = payload;
    if (!id || !email || !passwordHash || !displayName) {
      this.logger.warn('user.created missing required fields');
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    await this.userRepo.insert({
      id,
      email: normalizedEmail,
      passwordHash,
      displayName,
      role: role || 'subscriber',
      bio: bio || null,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    });
    const redisUser = {
      id,
      email: normalizedEmail,
      passwordHash,
      displayName,
      role: role || 'subscriber',
      bio: bio ?? null,
      avatarUrl: null,
      createdAt,
      updatedAt: createdAt,
    };
    await this.redis.set(USER_KEY(id), JSON.stringify(redisUser));
    await this.redis.set(USER_EMAIL_KEY(normalizedEmail), id);
    this.logger.log(`user.created persisted id=${id}`);
  }

  async handleUserUpdated(payload: any): Promise<void> {
    const { userId, displayName, bio, avatarUrl, updatedAt } = payload;
    if (!userId) return;
    await this.userRepo.update(
      { id: userId },
      { displayName, bio, avatarUrl, updatedAt: new Date(updatedAt || Date.now()) } as any,
    );
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      const redisUser = {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt?.toISOString(),
        updatedAt: user.updatedAt?.toISOString(),
      };
      await this.redis.set(USER_KEY(userId), JSON.stringify(redisUser));
    }
    this.logger.log(`user.updated persisted userId=${userId}`);
  }

  async handlePostCreated(payload: any): Promise<void> {
    const {
      postId,
      creatorId,
      contentType,
      visibility,
      mediaUrls,
      caption,
      requiredTierId,
      ppvPrice,
    } = payload;
    if (!postId || !creatorId || !contentType) return;
    await this.postRepo.insert({
      id: postId,
      creatorId,
      contentType,
      caption: caption || null,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      visibility: visibility || 'public',
      requiredTierId: requiredTierId || null,
      ppvPrice: ppvPrice ?? null,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
    });
    const postJson = {
      id: postId,
      creatorId,
      contentType,
      caption: caption || null,
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      visibility: visibility || 'public',
      requiredTierId: requiredTierId || null,
      ppvPrice: ppvPrice ?? null,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(POST_KEY(postId), JSON.stringify(postJson));
    if ((visibility || 'public') === 'public') {
      await this.redis.lPush(POSTS_PUBLIC_IDS, postId);
    }
    await this.redis.lPush(POSTS_CREATOR_PREFIX(creatorId), postId);
    this.logger.log(`content.post.created persisted postId=${postId}`);
  }

  async handlePostUpdated(payload: any): Promise<void> {
    const { postId, ...data } = payload;
    if (!postId) return;
    await this.postRepo.update({ id: postId }, data as any);
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (post) {
      await this.redis.set(
        POST_KEY(postId),
        JSON.stringify({
          ...post,
          createdAt: (post as any).createdAt?.toISOString?.(),
        }),
      );
    }
    this.logger.log(`content.post.updated persisted postId=${postId}`);
  }

  async handlePostDeleted(payload: any): Promise<void> {
    const { postId } = payload;
    if (!postId) return;
    await this.postLikeRepo.delete({ postId });
    await this.postCommentRepo.delete({ postId });
    await this.postRepo.delete({ id: postId });
    await this.redis.del(POST_KEY(postId));
    this.logger.log(`content.post.deleted postId=${postId}`);
  }

  async handlePostLiked(payload: any): Promise<void> {
    const { postId, userId } = payload;
    if (!postId || !userId) return;
    await this.postLikeRepo.insert({ postId, userId, createdAt: new Date() });
    await this.postRepo.increment({ id: postId }, 'likeCount', 1);
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (post) {
      await this.redis.set(
        POST_KEY(postId),
        JSON.stringify({
          ...post,
          likeCount: post.likeCount,
          createdAt: (post as any).createdAt?.toISOString?.(),
        }),
      );
    }
    this.logger.log(`content.post.liked postId=${postId} userId=${userId}`);
  }

  async handlePostUnliked(payload: any): Promise<void> {
    const { postId, userId } = payload;
    if (!postId || !userId) return;
    await this.postLikeRepo.delete({ postId, userId });
    await this.postRepo.decrement({ id: postId }, 'likeCount', 1);
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (post) {
      await this.redis.set(
        POST_KEY(postId),
        JSON.stringify({
          ...post,
          likeCount: Math.max(0, post.likeCount),
          createdAt: (post as any).createdAt?.toISOString?.(),
        }),
      );
    }
    this.logger.log(`content.post.unliked postId=${postId} userId=${userId}`);
  }

  async handleCommentCreated(payload: any): Promise<void> {
    const { postId, commentId, userId, content, createdAt } = payload;
    if (!postId || !commentId || !userId || !content) return;
    await this.postCommentRepo.insert({
      id: commentId,
      postId,
      userId,
      content,
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    });
    await this.postRepo.increment({ id: postId }, 'commentCount', 1);
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (post) {
      await this.redis.set(
        POST_KEY(postId),
        JSON.stringify({
          ...post,
          commentCount: post.commentCount,
          createdAt: (post as any).createdAt?.toISOString?.(),
        }),
      );
    }
    this.logger.log(`content.comment.created postId=${postId} commentId=${commentId}`);
  }

  async handleMediaUploaded(payload: any): Promise<void> {
    const { mediaId, userId, storageUrl, mimeType, fileSize } = payload;
    if (!mediaId || !userId || !storageUrl) return;
    await this.mediaFileRepo.insert({
      id: mediaId,
      userId,
      fileType: (mimeType && mimeType.split('/')[0]) || 'image',
      originalUrl: storageUrl,
      fileName: storageUrl.split('/').pop() || mediaId,
      mimeType: mimeType || null,
      fileSize: fileSize ?? null,
      processingStatus: 'completed',
      createdAt: new Date(),
    });
    const mediaJson = {
      id: mediaId,
      userId,
      originalUrl: storageUrl,
      mimeType: mimeType || null,
      fileSize: fileSize ?? null,
      processingStatus: 'completed',
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(MEDIA_KEY(mediaId), JSON.stringify(mediaJson));
    this.logger.log(`media.uploaded persisted mediaId=${mediaId}`);
  }

  async handleMediaDeleted(payload: any): Promise<void> {
    const { mediaId } = payload;
    if (!mediaId) return;
    await this.mediaFileRepo.delete({ id: mediaId });
    await this.redis.del(MEDIA_KEY(mediaId));
    this.logger.log(`media.deleted mediaId=${mediaId}`);
  }

  async handleSubscriptionCreated(payload: any): Promise<void> {
    const { subscriptionId, subscriberId, creatorId, tierId, startDate } = payload;
    if (!subscriptionId || !subscriberId || !creatorId || !tierId) return;
    await this.subscriptionRepo.insert({
      id: subscriptionId,
      subscriberId,
      creatorId,
      tierId,
      status: 'active',
      currentPeriodStart: startDate ? new Date(startDate) : new Date(),
      createdAt: new Date(),
    });
    this.logger.log(`subscription.created persisted subscriptionId=${subscriptionId}`);
  }

  async handlePaymentCompleted(payload: any): Promise<void> {
    const { transactionId, userId, amount, type, metadata } = payload;
    if (!transactionId || !userId) return;
    await this.transactionRepo.insert({
      id: transactionId,
      userId,
      type: type || 'subscription',
      amount,
      status: 'succeeded',
      metadata: metadata || null,
      createdAt: new Date(),
    });
    this.logger.log(`payment.completed transactionId=${transactionId}`);
  }

  async handleTipSent(payload: any): Promise<void> {
    const { senderId, recipientId, amount, transactionId } = payload;
    if (!senderId || !recipientId || amount == null) return;
    const id = transactionId || `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await this.tipRepo.insert({
      id,
      fromUserId: senderId,
      toUserId: recipientId,
      amount,
      stripePaymentId: transactionId || null,
      createdAt: new Date(),
    });
    this.logger.log(`payment.tip.sent id=${id}`);
  }

  async handlePostPurchased(payload: any): Promise<void> {
    const { userId, postId, amount, transactionId } = payload;
    if (!userId || !postId || amount == null) return;
    const id = transactionId || `ppv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await this.postPurchaseRepo.insert({
      id,
      postId,
      buyerId: userId,
      amount,
      stripePaymentId: transactionId || null,
      createdAt: new Date(),
    });
    this.logger.log(`payment.post.purchased id=${id}`);
  }

  async handleTierCreated(payload: any): Promise<void> {
    const { tierId, creatorId, name, description, priceMonthly, priceYearly, benefits, stripePriceId } = payload;
    if (!tierId || !creatorId || !name || priceMonthly == null) return;
    await this.tierRepo.insert({
      id: tierId,
      creatorId,
      name,
      description: description || null,
      priceMonthly,
      priceYearly: priceYearly ?? null,
      benefits: Array.isArray(benefits) ? benefits : [],
      isActive: true,
      stripePriceId: stripePriceId || null,
      createdAt: new Date(),
    });
    this.logger.log(`subscription.tier.created tierId=${tierId}`);
  }
}
