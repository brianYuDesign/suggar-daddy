import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "@suggar-daddy/redis";
import { UserType, PermissionRole } from "@suggar-daddy/common";
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
  FollowEntity,
  BookmarkEntity,
  DmPurchaseEntity,
  StoryEntity,
  StoryViewEntity,
  DiamondBalanceEntity,
  DiamondTransactionEntity,
  DiamondPurchaseEntity,
  UserBehaviorEventEntity,
  SwipeEntity,
  MatchEntity,
  ProfileViewEntity,
  VerificationRequestEntity,
} from "@suggar-daddy/database";

const USER_KEY = (id: string) => `user:${id}`;
const USER_EMAIL_KEY = (email: string) => `user:email:${email}`;
const POST_KEY = (id: string) => `post:${id}`;
const POSTS_PUBLIC_IDS = "posts:public:ids";
const POSTS_CREATOR_PREFIX = (creatorId: string) =>
  `posts:creator:${creatorId}`;
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
    @InjectRepository(FollowEntity)
    private readonly followRepo: Repository<FollowEntity>,
    @InjectRepository(BookmarkEntity)
    private readonly bookmarkRepo: Repository<BookmarkEntity>,
    @InjectRepository(DmPurchaseEntity)
    private readonly dmPurchaseRepo: Repository<DmPurchaseEntity>,
    @InjectRepository(StoryEntity)
    private readonly storyRepo: Repository<StoryEntity>,
    @InjectRepository(StoryViewEntity)
    private readonly storyViewRepo: Repository<StoryViewEntity>,
    @InjectRepository(DiamondBalanceEntity)
    private readonly diamondBalanceRepo: Repository<DiamondBalanceEntity>,
    @InjectRepository(DiamondTransactionEntity)
    private readonly diamondTxRepo: Repository<DiamondTransactionEntity>,
    @InjectRepository(DiamondPurchaseEntity)
    private readonly diamondPurchaseRepo: Repository<DiamondPurchaseEntity>,
    @InjectRepository(UserBehaviorEventEntity)
    private readonly behaviorEventRepo: Repository<UserBehaviorEventEntity>,
    @InjectRepository(SwipeEntity)
    private readonly swipeRepo: Repository<SwipeEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchRepo: Repository<MatchEntity>,
    @InjectRepository(ProfileViewEntity)
    private readonly profileViewRepo: Repository<ProfileViewEntity>,
    @InjectRepository(VerificationRequestEntity)
    private readonly verificationRequestRepo: Repository<VerificationRequestEntity>,
    private readonly redis: RedisService,
  ) {}

  async handleUserCreated(payload: Record<string, unknown>): Promise<void> {
    const { id, email, displayName, userType, bio, createdAt, username } = payload;
    if (!id || !email || !displayName) {
      this.logger.warn("user.created missing required fields");
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // passwordHash is no longer sent via Kafka for security.
    // Read the full user record from Redis (written by auth-service at registration).
    let passwordHash: string | null = null;
    const existingUserRaw = await this.redis.get(USER_KEY(id as string));
    if (existingUserRaw) {
      const existingUser = JSON.parse(existingUserRaw);
      passwordHash = existingUser.passwordHash ?? null;
    }

    await this.userRepo.insert({
      id: id as string,
      email: normalizedEmail,
      passwordHash,
      displayName: displayName as string,
      username: (username as string) || null,
      userType: (userType as UserType) || UserType.SUGAR_BABY,
      permissionRole: PermissionRole.SUBSCRIBER,
      bio: (bio as string) || null,
      createdAt: createdAt
        ? new Date(createdAt as string | number)
        : new Date(),
    });
    // Redis user record is already written by auth-service; update with DB-canonical fields
    const redisUser = {
      id: id as string,
      email: normalizedEmail,
      passwordHash,
      displayName: displayName as string,
      username: (username as string) || null,
      userType: (userType as string) || "sugar_baby",
      permissionRole: "subscriber",
      bio: (bio as string) ?? null,
      avatarUrl: null,
      createdAt,
      updatedAt: createdAt,
    };
    await this.redis.set(USER_KEY(id as string), JSON.stringify(redisUser));
    await this.redis.set(USER_EMAIL_KEY(normalizedEmail), id as string);
    if (username) {
      await this.redis.set(`user:username:${username}`, id as string);
    }
    this.logger.log(`user.created persisted id=${id}`);
  }

  async handleUserUpdated(payload: Record<string, unknown>): Promise<void> {
    const { userId, displayName, bio, avatarUrl, updatedAt } = payload;
    if (!userId) return;
    await this.userRepo.update(
      { id: userId as string },
      {
        displayName: displayName as string,
        bio: bio as string | null,
        avatarUrl: avatarUrl as string | null,
        updatedAt: new Date((updatedAt as string) || Date.now()),
      },
    );
    const user = await this.userRepo.findOne({
      where: { id: userId as string },
    });
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
      await this.redis.set(
        USER_KEY(userId as string),
        JSON.stringify(redisUser),
      );
    }
    this.logger.log(`user.updated persisted userId=${userId}`);
  }

  async handlePostCreated(payload: Record<string, unknown>): Promise<void> {
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
      id: postId as string,
      creatorId: creatorId as string,
      contentType: contentType as string,
      caption: (caption as string) || null,
      mediaUrls: Array.isArray(mediaUrls) ? (mediaUrls as string[]) : [],
      visibility: (visibility as string) || "public",
      requiredTierId: (requiredTierId as string) || null,
      ppvPrice: (ppvPrice as number) ?? null,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
    });
    const postJson = {
      id: postId as string,
      creatorId: creatorId as string,
      contentType: contentType as string,
      caption: (caption as string) || null,
      mediaUrls: Array.isArray(mediaUrls) ? (mediaUrls as string[]) : [],
      visibility: (visibility as string) || "public",
      requiredTierId: (requiredTierId as string) || null,
      ppvPrice: (ppvPrice as number) ?? null,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(POST_KEY(postId as string), JSON.stringify(postJson));
    if (((visibility as string) || "public") === "public") {
      await this.redis.lPush(POSTS_PUBLIC_IDS, postId as string);
    }
    await this.redis.lPush(
      POSTS_CREATOR_PREFIX(creatorId as string),
      postId as string,
    );
    this.logger.log(`content.post.created persisted postId=${postId}`);
  }

  async handlePostUpdated(payload: Record<string, unknown>): Promise<void> {
    const { postId, ...data } = payload;
    if (!postId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.postRepo.update({ id: postId as string }, data as any);
    const post = await this.postRepo.findOne({
      where: { id: postId as string },
    });
    if (post) {
      await this.redis.set(
        POST_KEY(postId as string),
        JSON.stringify({
          ...post,
          createdAt:
            post.createdAt instanceof Date
              ? post.createdAt.toISOString()
              : String(post.createdAt),
        }),
      );
    }
    this.logger.log(`content.post.updated persisted postId=${postId}`);
  }

  async handlePostDeleted(payload: Record<string, unknown>): Promise<void> {
    const { postId } = payload;
    if (!postId) return;
    await this.postLikeRepo.delete({ postId: postId as string });
    await this.postCommentRepo.delete({ postId: postId as string });
    await this.postRepo.delete({ id: postId as string });
    await this.redis.del(POST_KEY(postId as string));
    this.logger.log(`content.post.deleted postId=${postId}`);
  }

  async handlePostLiked(payload: Record<string, unknown>): Promise<void> {
    const { postId, userId } = payload;
    if (!postId || !userId) return;
    await this.postLikeRepo.insert({
      postId: postId as string,
      userId: userId as string,
      createdAt: new Date(),
    });
    await this.postRepo.increment({ id: postId as string }, "likeCount", 1);
    const post = await this.postRepo.findOne({
      where: { id: postId as string },
    });
    if (post) {
      await this.redis.set(
        POST_KEY(postId as string),
        JSON.stringify({
          ...post,
          likeCount: post.likeCount,
          createdAt:
            post.createdAt instanceof Date
              ? post.createdAt.toISOString()
              : String(post.createdAt),
        }),
      );
    }
    this.logger.log(`content.post.liked postId=${postId} userId=${userId}`);
  }

  async handlePostUnliked(payload: Record<string, unknown>): Promise<void> {
    const { postId, userId } = payload;
    if (!postId || !userId) return;
    await this.postLikeRepo.delete({
      postId: postId as string,
      userId: userId as string,
    });
    await this.postRepo.decrement({ id: postId as string }, "likeCount", 1);
    const post = await this.postRepo.findOne({
      where: { id: postId as string },
    });
    if (post) {
      await this.redis.set(
        POST_KEY(postId as string),
        JSON.stringify({
          ...post,
          likeCount: Math.max(0, post.likeCount),
          createdAt:
            post.createdAt instanceof Date
              ? post.createdAt.toISOString()
              : String(post.createdAt),
        }),
      );
    }
    this.logger.log(`content.post.unliked postId=${postId} userId=${userId}`);
  }

  async handleCommentCreated(payload: Record<string, unknown>): Promise<void> {
    const { postId, commentId, userId, content, createdAt } = payload;
    if (!postId || !commentId || !userId || !content) return;
    await this.postCommentRepo.insert({
      id: commentId as string,
      postId: postId as string,
      userId: userId as string,
      content: content as string,
      createdAt: createdAt
        ? new Date(createdAt as string | number)
        : new Date(),
    });
    await this.postRepo.increment({ id: postId as string }, "commentCount", 1);
    const post = await this.postRepo.findOne({
      where: { id: postId as string },
    });
    if (post) {
      await this.redis.set(
        POST_KEY(postId as string),
        JSON.stringify({
          ...post,
          commentCount: post.commentCount,
          createdAt:
            post.createdAt instanceof Date
              ? post.createdAt.toISOString()
              : String(post.createdAt),
        }),
      );
    }
    this.logger.log(
      `content.comment.created postId=${postId} commentId=${commentId}`,
    );
  }

  async handleMediaUploaded(payload: Record<string, unknown>): Promise<void> {
    const { mediaId, userId, storageUrl, mimeType, fileSize } = payload;
    if (!mediaId || !userId || !storageUrl) return;
    const mimeTypeStr = (mimeType as string) || "application/octet-stream";
    const fileTypeFromMime = mimeTypeStr.split("/")[0] || "file";
    await this.mediaFileRepo.insert({
      id: mediaId as string,
      userId: userId as string,
      fileType: fileTypeFromMime,
      originalUrl: storageUrl as string,
      fileName: (storageUrl as string).split("/").pop() || (mediaId as string),
      mimeType: mimeTypeStr || null,
      fileSize: (fileSize as number) ?? null,
      processingStatus: "completed",
      createdAt: new Date(),
    });
    const mediaJson = {
      id: mediaId as string,
      userId: userId as string,
      originalUrl: storageUrl as string,
      mimeType: mimeTypeStr || null,
      fileSize: (fileSize as number) ?? null,
      processingStatus: "completed",
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(
      MEDIA_KEY(mediaId as string),
      JSON.stringify(mediaJson),
    );
    this.logger.log(`media.uploaded persisted mediaId=${mediaId}`);
  }

  async handleMediaDeleted(payload: Record<string, unknown>): Promise<void> {
    const { mediaId } = payload;
    if (!mediaId) return;
    await this.mediaFileRepo.delete({ id: mediaId as string });
    await this.redis.del(MEDIA_KEY(mediaId as string));
    this.logger.log(`media.deleted mediaId=${mediaId}`);
  }

  async handleSubscriptionCreated(
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { subscriptionId, subscriberId, creatorId, tierId, startDate } =
      payload;
    if (!subscriptionId || !subscriberId || !creatorId || !tierId) return;
    await this.subscriptionRepo.insert({
      id: subscriptionId as string,
      subscriberId: subscriberId as string,
      creatorId: creatorId as string,
      tierId: tierId as string,
      status: "active",
      currentPeriodStart: startDate
        ? new Date(startDate as string | number)
        : new Date(),
      createdAt: new Date(),
    });
    this.logger.log(
      `subscription.created persisted subscriptionId=${subscriptionId}`,
    );
  }

  async handlePaymentCompleted(
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { transactionId, userId, amount, type, metadata } = payload;
    if (!transactionId || !userId) return;
    await this.transactionRepo.insert({
      id: transactionId as string,
      userId: userId as string,
      type: (type as string) || "subscription",
      amount: amount as number,
      status: "succeeded",
      metadata: (metadata as object) || null,
      createdAt: new Date(),
    });
    this.logger.log(`payment.completed transactionId=${transactionId}`);
  }

  async handlePaymentRefunded(
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { transactionId, refundedAmount, reason, stripeRefundId, refundedAt } = payload;
    if (!transactionId) return;
    await this.transactionRepo.update(
      { id: transactionId as string },
      {
        status: 'refunded',
        metadata: {
          refundedAmount: refundedAmount as number,
          refundReason: (reason as string) || null,
          stripeRefundId: (stripeRefundId as string) || null,
          refundedAt: refundedAt as string,
        },
      },
    );
    this.logger.log(`payment.refunded transactionId=${transactionId}`);
  }

  async handleTipSent(payload: Record<string, unknown>): Promise<void> {
    const { senderId, recipientId, amount, transactionId } = payload;
    if (!senderId || !recipientId || amount == null) return;
    const id =
      (transactionId as string) ||
      `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await this.tipRepo.insert({
      id,
      fromUserId: senderId as string,
      toUserId: recipientId as string,
      amount: amount as number,
      stripePaymentId: (transactionId as string) || null,
      createdAt: new Date(),
    });
    this.logger.log(`payment.tip.sent id=${id}`);
  }

  async handlePostPurchased(payload: Record<string, unknown>): Promise<void> {
    const { userId, postId, amount, transactionId } = payload;
    if (!userId || !postId || amount == null) return;
    const id =
      (transactionId as string) ||
      `ppv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await this.postPurchaseRepo.insert({
      id,
      postId: postId as string,
      buyerId: userId as string,
      amount: amount as number,
      stripePaymentId: (transactionId as string) || null,
      createdAt: new Date(),
    });
    this.logger.log(`payment.post.purchased id=${id}`);
  }

  async handleTierCreated(payload: Record<string, unknown>): Promise<void> {
    const {
      tierId,
      creatorId,
      name,
      description,
      priceMonthly,
      priceYearly,
      benefits,
      stripePriceId,
    } = payload;
    if (!tierId || !creatorId || !name || priceMonthly == null) return;
    await this.tierRepo.insert({
      id: tierId as string,
      creatorId: creatorId as string,
      name: name as string,
      description: (description as string) || null,
      priceMonthly: priceMonthly as number,
      priceYearly: (priceYearly as number) ?? null,
      benefits: Array.isArray(benefits) ? benefits : [],
      isActive: true,
      stripePriceId: (stripePriceId as string) || null,
      createdAt: new Date(),
    });
    this.logger.log(`subscription.tier.created tierId=${tierId}`);
  }

  async handleUserFollowed(payload: Record<string, unknown>): Promise<void> {
    const { followerId, followedId, followedAt } = payload;
    if (!followerId || !followedId) return;
    await this.followRepo.insert({
      followerId: followerId as string,
      followedId: followedId as string,
      createdAt: followedAt ? new Date(followedAt as string) : new Date(),
    });
    this.logger.log(`social.user.followed persisted follower=${followerId} followed=${followedId}`);
  }

  async handleUserUnfollowed(payload: Record<string, unknown>): Promise<void> {
    const { followerId, followedId } = payload;
    if (!followerId || !followedId) return;
    await this.followRepo.delete({
      followerId: followerId as string,
      followedId: followedId as string,
    });
    this.logger.log(`social.user.unfollowed persisted follower=${followerId} followed=${followedId}`);
  }

  async handlePostBookmarked(payload: Record<string, unknown>): Promise<void> {
    const { userId, postId, bookmarkedAt } = payload;
    if (!userId || !postId) return;
    await this.bookmarkRepo.insert({
      userId: userId as string,
      postId: postId as string,
      createdAt: bookmarkedAt ? new Date(bookmarkedAt as string) : new Date(),
    });
    this.logger.log(`content.post.bookmarked userId=${userId} postId=${postId}`);
  }

  async handlePostUnbookmarked(payload: Record<string, unknown>): Promise<void> {
    const { userId, postId } = payload;
    if (!userId || !postId) return;
    await this.bookmarkRepo.delete({ userId: userId as string, postId: postId as string });
    this.logger.log(`content.post.unbookmarked userId=${userId} postId=${postId}`);
  }

  async handleCommentDeleted(payload: Record<string, unknown>): Promise<void> {
    const { postId, commentId } = payload;
    if (!postId || !commentId) return;
    await this.postCommentRepo.delete({ id: commentId as string });
    await this.postRepo.decrement({ id: postId as string }, 'commentCount', 1);
    this.logger.log(`content.comment.deleted postId=${postId} commentId=${commentId}`);
  }

  async handleStoryCreated(payload: Record<string, unknown>): Promise<void> {
    const { storyId, creatorId, contentType, mediaUrl, caption, expiresAt, createdAt } = payload;
    if (!storyId || !creatorId) return;
    await this.storyRepo.insert({
      id: storyId as string,
      creatorId: creatorId as string,
      contentType: (contentType as string) || 'image',
      mediaUrl: mediaUrl as string,
      caption: (caption as string) || null,
      viewCount: 0,
      expiresAt: expiresAt ? new Date(expiresAt as string) : new Date(Date.now() + 86400000),
      createdAt: createdAt ? new Date(createdAt as string) : new Date(),
    });
    this.logger.log(`content.story.created storyId=${storyId}`);
  }

  async handleDmPurchased(payload: Record<string, unknown>): Promise<void> {
    const { purchaseId, buyerId, creatorId, amount, createdAt } = payload;
    if (!purchaseId || !buyerId || !creatorId) return;
    await this.dmPurchaseRepo.insert({
      id: purchaseId as string,
      buyerId: buyerId as string,
      creatorId: creatorId as string,
      amount: (amount as number) || 0,
      stripePaymentId: null,
      createdAt: createdAt ? new Date(createdAt as string) : new Date(),
    });
    this.logger.log(`messaging.dm.purchased purchaseId=${purchaseId}`);
  }

  // ── Diamond Event Handlers ────────────────────────────────────

  async handleDiamondPurchased(payload: Record<string, unknown>): Promise<void> {
    const { purchaseId, userId, diamondAmount, amountUsd, stripePaymentId, purchasedAt } = payload;
    if (!purchaseId || !userId) return;

    await this.diamondPurchaseRepo.insert({
      id: purchaseId as string,
      userId: userId as string,
      packageId: 'unknown',
      diamondAmount: (diamondAmount as number) || 0,
      bonusDiamonds: 0,
      totalDiamonds: (diamondAmount as number) || 0,
      amountUsd: (amountUsd as number) || 0,
      stripePaymentId: (stripePaymentId as string) || null,
      status: 'completed',
      createdAt: purchasedAt ? new Date(purchasedAt as string) : new Date(),
    });

    // Upsert diamond balance
    const existing = await this.diamondBalanceRepo.findOne({ where: { userId: userId as string } });
    if (existing) {
      existing.totalPurchased += (diamondAmount as number) || 0;
      existing.balance += (diamondAmount as number) || 0;
      await this.diamondBalanceRepo.save(existing);
    } else {
      await this.diamondBalanceRepo.insert({
        userId: userId as string,
        balance: (diamondAmount as number) || 0,
        totalPurchased: (diamondAmount as number) || 0,
        totalSpent: 0,
        totalReceived: 0,
        totalConverted: 0,
      });
    }

    this.logger.log(`diamond.purchased persisted purchaseId=${purchaseId}`);
  }

  async handleDiamondSpent(payload: Record<string, unknown>): Promise<void> {
    const { userId, amount, referenceType, referenceId, spentAt } = payload;
    if (!userId || amount == null) return;

    await this.diamondTxRepo.insert({
      userId: userId as string,
      type: 'spend',
      amount: -(amount as number),
      referenceType: (referenceType as string) || null,
      referenceId: (referenceId as string) || null,
      description: `Spent ${amount} diamonds on ${referenceType || 'unknown'}`,
      createdAt: spentAt ? new Date(spentAt as string) : new Date(),
    });

    this.logger.log(`diamond.spent persisted userId=${userId} amount=${amount}`);
  }

  async handleDiamondConverted(payload: Record<string, unknown>): Promise<void> {
    const { userId, diamondAmount, cashAmount, convertedAt } = payload;
    if (!userId || diamondAmount == null) return;

    await this.diamondTxRepo.insert({
      userId: userId as string,
      type: 'conversion',
      amount: -(diamondAmount as number),
      referenceType: 'cash_conversion',
      description: `Converted ${diamondAmount} diamonds to $${cashAmount}`,
      createdAt: convertedAt ? new Date(convertedAt as string) : new Date(),
    });

    // Update balance in DB
    const existing = await this.diamondBalanceRepo.findOne({ where: { userId: userId as string } });
    if (existing) {
      existing.totalConverted += (diamondAmount as number) || 0;
      existing.balance -= (diamondAmount as number) || 0;
      await this.diamondBalanceRepo.save(existing);
    }

    this.logger.log(`diamond.converted persisted userId=${userId} diamonds=${diamondAmount} cash=${cashAmount}`);
  }

  // ── Behavior Event Handlers ────────────────────────────────────

  async handleBehaviorBatch(payload: Record<string, unknown>): Promise<void> {
    const { userId, events } = payload;
    if (!userId || !Array.isArray(events) || events.length === 0) return;

    const entities = events.map((evt: Record<string, unknown>) => {
      const entity = new UserBehaviorEventEntity();
      entity.userId = userId as string;
      entity.eventType = evt.eventType as UserBehaviorEventEntity['eventType'];
      entity.targetUserId = (evt.targetUserId as string) || null;
      entity.metadata = (evt.metadata as Record<string, unknown>) || null;
      entity.createdAt = evt.timestamp
        ? new Date(evt.timestamp as number)
        : new Date();
      return entity;
    });

    await this.behaviorEventRepo.save(entities);
    this.logger.log(`behavior.batch persisted userId=${userId} count=${entities.length}`);
  }

  // ── Matching Event Handlers ────────────────────────────────────

  async handleSwipeEvent(payload: Record<string, unknown>): Promise<void> {
    const { swiperId, targetUserId, action } = payload;
    if (!swiperId || !targetUserId || !action) return;

    await this.swipeRepo.upsert(
      {
        swiperId: swiperId as string,
        swipedId: targetUserId as string,
        action: action as string,
        createdAt: new Date(),
      },
      ['swiperId', 'swipedId'],
    );
    this.logger.log(`matching.swipe persisted swiper=${swiperId} target=${targetUserId} action=${action}`);
  }

  async handleMatchEvent(payload: Record<string, unknown>): Promise<void> {
    const { userAId, userBId } = payload;
    if (!userAId || !userBId) return;

    // Normalize order to avoid duplicate matches
    const [first, second] = [userAId as string, userBId as string].sort();
    await this.matchRepo.upsert(
      {
        userAId: first,
        userBId: second,
        status: 'active',
        matchedAt: new Date(),
      },
      ['userAId', 'userBId'],
    );
    this.logger.log(`matching.matched persisted userA=${first} userB=${second}`);
  }

  async handleUnmatchEvent(payload: Record<string, unknown>): Promise<void> {
    const { userAId, userBId } = payload;
    if (!userAId || !userBId) return;

    const [first, second] = [userAId as string, userBId as string].sort();
    await this.matchRepo.update(
      { userAId: first, userBId: second },
      { status: 'unmatched' },
    );
    this.logger.log(`matching.unmatched persisted userA=${first} userB=${second}`);
  }

  // ── Profile View Handlers ────────────────────────────────────

  async handleProfileViewed(payload: Record<string, unknown>): Promise<void> {
    const { viewedUserId, viewerId, viewedAt } = payload;
    if (!viewedUserId || !viewerId) return;

    await this.profileViewRepo.insert({
      viewedUserId: viewedUserId as string,
      viewerId: viewerId as string,
      viewedAt: viewedAt ? new Date(viewedAt as string) : new Date(),
    });
    this.logger.log(`user.profile.viewed persisted viewed=${viewedUserId} viewer=${viewerId}`);
  }

  // ── Verification Handlers ────────────────────────────────────

  async handleVerificationSubmitted(payload: Record<string, unknown>): Promise<void> {
    const { requestId, userId, selfieUrl, submittedAt } = payload;
    if (!requestId || !userId || !selfieUrl) return;

    await this.verificationRequestRepo.insert({
      id: requestId as string,
      userId: userId as string,
      selfieUrl: selfieUrl as string,
      status: 'pending',
      createdAt: submittedAt ? new Date(submittedAt as string) : new Date(),
    });

    // Update user verificationStatus in DB
    await this.userRepo.update(
      { id: userId as string },
      { verificationStatus: 'pending' },
    );

    this.logger.log(`user.verification.submitted persisted requestId=${requestId}`);
  }

  async handleVerificationReviewed(payload: Record<string, unknown>): Promise<void> {
    const { requestId, userId, action, reason, reviewedBy, reviewedAt } = payload;
    if (!requestId || !userId || !action) return;

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await this.verificationRequestRepo.update(
      { id: requestId as string },
      {
        status: newStatus,
        rejectionReason: (reason as string) || null,
        reviewedBy: (reviewedBy as string) || null,
        reviewedAt: reviewedAt ? new Date(reviewedAt as string) : new Date(),
      },
    );

    // Update user verificationStatus in DB
    await this.userRepo.update(
      { id: userId as string },
      { verificationStatus: newStatus },
    );

    this.logger.log(`user.verification.${action} persisted requestId=${requestId} userId=${userId}`);
  }
}
