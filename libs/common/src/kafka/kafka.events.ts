/**
 * Kafka Event Topics for Inter-Service Communication
 */

// User Events (auth / user-service → DB Writer)
export const USER_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_BLOCKED: 'user.blocked',
  USER_UNBLOCKED: 'user.unblocked',
  USER_REPORTED: 'user.reported',
} as const;

// Matching Events (matching-service → notification / messaging)
export const MATCHING_EVENTS = {
  MATCHED: 'matching.matched',
  UNMATCHED: 'matching.unmatched',
} as const;

// Subscription Events
export const SUBSCRIPTION_EVENTS = {
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  TIER_CREATED: 'subscription.tier.created',
  TIER_UPDATED: 'subscription.tier.updated',
} as const;

// Payment Events
export const PAYMENT_EVENTS = {
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_FAILED_ORPHAN: 'payment.failed.orphan', // ✅ Bug 2: 新增孤兒交易事件
  PAYMENT_REFUNDED: 'payment.refunded',
  TIP_SENT: 'payment.tip.sent',
  POST_PURCHASED: 'payment.post.purchased',
  WALLET_CREDITED: 'payment.wallet.credited',
  WITHDRAWAL_REQUESTED: 'payment.withdrawal.requested',
  WITHDRAWAL_COMPLETED: 'payment.withdrawal.completed',
} as const;

// Social Events (follow system)
export const SOCIAL_EVENTS = {
  USER_FOLLOWED: 'social.user.followed',
  USER_UNFOLLOWED: 'social.user.unfollowed',
} as const;

// Content Events
export const CONTENT_EVENTS = {
  POST_CREATED: 'content.post.created',
  POST_UPDATED: 'content.post.updated',
  POST_DELETED: 'content.post.deleted',
  POST_LIKED: 'content.post.liked',
  POST_UNLIKED: 'content.post.unliked',
  COMMENT_CREATED: 'content.comment.created',
  COMMENT_DELETED: 'content.comment.deleted',
  POST_BOOKMARKED: 'content.post.bookmarked',
  POST_UNBOOKMARKED: 'content.post.unbookmarked',
  POST_REPORTED: 'content.post.reported',
  POST_TAKEN_DOWN: 'content.post.taken_down',
  POST_REINSTATED: 'content.post.reinstated',
  COMMENT_REPORTED: 'content.comment.reported',
  STORY_CREATED: 'content.story.created',
  STORY_DELETED: 'content.story.deleted',
  STORY_VIEWED: 'content.story.viewed',
} as const;

// Media Events
export const MEDIA_EVENTS = {
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_DELETED: 'media.deleted',
  MEDIA_PROCESSED: 'media.processed',
  VIDEO_PROCESSED: 'media.video.processed',
} as const;

// Messaging Events (paid DM, broadcast)
export const MESSAGING_EVENTS = {
  DM_PURCHASED: 'messaging.dm.purchased',
  BROADCAST_SENT: 'messaging.broadcast.sent',
} as const;

// 系統事件（DLQ、監控）
export const SYSTEM_EVENTS = {
  DEAD_LETTER_QUEUE: 'dead-letter-queue',
} as const;

// Event Payload Interfaces
export interface SubscriptionCreatedEvent {
  subscriptionId: string;
  subscriberId: string;
  creatorId: string;
  tierId: string;
  startDate: Date;
}

export interface PaymentCompletedEvent {
  transactionId: string;
  userId: string;
  amount: number;
  type: 'subscription' | 'tip' | 'ppv';
  metadata?: Record<string, unknown>;
}

export interface PaymentRefundedEvent {
  transactionId: string;
  userId: string;
  amount: number;
  refundedAmount: number;
  stripeRefundId: string | null;
  reason: string | null;
  refundedAt: string;
}

export interface PostCreatedEvent {
  postId: string;
  creatorId: string;
  contentType: string;
  visibility: string;
  mediaUrls: string[];
  caption?: string;
  requiredTierId?: string;
  ppvPrice?: number;
}

export interface MediaUploadedEvent {
  mediaId: string;
  userId: string;
  storageUrl: string;
  mimeType: string;
  fileSize: number;
}

// User event payloads (DB Writer persists these)
export interface MediaVideoProcessedEvent {
  mediaId: string;
  userId: string;
  s3Key: string;
  thumbnailUrl: string;
  previewUrl: string;
  duration: number;
  processingStatus: 'ready' | 'failed';
}

export interface UserCreatedEvent {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  bio?: string;
  accountStatus?: string;
  emailVerified?: boolean;
  createdAt: string;
}

export interface UserUpdatedEvent {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  updatedAt: string;
}

export interface UserFollowedEvent {
  followerId: string;
  followedId: string;
  followedAt: string;
}

export interface UserUnfollowedEvent {
  followerId: string;
  followedId: string;
  unfollowedAt: string;
}

export interface PostBookmarkedEvent {
  userId: string;
  postId: string;
  bookmarkedAt: string;
}

export interface CommentDeletedEvent {
  postId: string;
  commentId: string;
  deletedBy: string;
  deletedAt: string;
}

export interface StoryCreatedEvent {
  storyId: string;
  creatorId: string;
  contentType: string;
  mediaUrl: string;
  caption?: string;
  expiresAt: string;
  createdAt: string;
}

export interface DmPurchasedEvent {
  purchaseId: string;
  buyerId: string;
  creatorId: string;
  amount: number;
  createdAt: string;
}

export interface BroadcastSentEvent {
  broadcastId: string;
  creatorId: string;
  content: string;
  recipientCount: number;
  createdAt: string;
}