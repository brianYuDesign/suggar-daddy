// API Versions
export const API_VERSION = 'v1';
export const API_PREFIX = `api/${API_VERSION}`;

// User Roles
export enum UserRole {
  SUGAR_DADDY = 'sugar_daddy',
  SUGAR_BABY = 'sugar_baby',
  CREATOR = 'creator',
  SUBSCRIBER = 'subscriber',
}

// Swipe Actions
export enum SwipeAction {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

// Match Status
export enum MatchStatus {
  ACTIVE = 'active',
  UNMATCHED = 'unmatched',
  BLOCKED = 'blocked',
}

// Subscription Status
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

// Content Visibility
export enum ContentVisibility {
  PUBLIC = 'public',
  SUBSCRIBERS = 'subscribers',
  TIER_SPECIFIC = 'tier_specific',
  PPV = 'ppv',
}

// Kafka Topics
export const KAFKA_TOPICS = {
  MATCHING_SWIPE: 'matching.swipe',
  MATCHING_MATCHED: 'matching.matched',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  CONTENT_PUBLISHED: 'content.published',
  NOTIFICATION_SEND: 'notification.send',
  USER_UPDATED: 'user.updated',
  USER_VERIFIED: 'user.verified',
} as const;

// Redis Keys
export const REDIS_KEYS = {
  USER_SESSION: (userId: string) => `session:${userId}`,
  USER_CARDS: (userId: string) => `cards:${userId}`,
  USER_LIKES: (userId: string) => `likes:${userId}`,
  USER_ONLINE: 'users:online',
  RATE_LIMIT: (key: string) => `ratelimit:${key}`,
} as const;
