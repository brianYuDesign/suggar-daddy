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
  TIP_SENT: 'payment.tip.sent',
  POST_PURCHASED: 'payment.post.purchased',
  WALLET_CREDITED: 'payment.wallet.credited',
  WITHDRAWAL_REQUESTED: 'payment.withdrawal.requested',
  WITHDRAWAL_COMPLETED: 'payment.withdrawal.completed',
} as const;

// Content Events
export const CONTENT_EVENTS = {
  POST_CREATED: 'content.post.created',
  POST_UPDATED: 'content.post.updated',
  POST_DELETED: 'content.post.deleted',
  POST_LIKED: 'content.post.liked',
  POST_UNLIKED: 'content.post.unliked',
  COMMENT_CREATED: 'content.comment.created',
  POST_REPORTED: 'content.post.reported',
  POST_TAKEN_DOWN: 'content.post.taken_down',
  POST_REINSTATED: 'content.post.reinstated',
  COMMENT_REPORTED: 'content.comment.reported',
} as const;

// Media Events
export const MEDIA_EVENTS = {
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_DELETED: 'media.deleted',
  MEDIA_PROCESSED: 'media.processed',
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
  metadata?: Record<string, any>;
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