import { UserRole, SubscriptionStatus, MatchStatus, ContentVisibility } from './constants';

// User Interface
export interface IUser {
  id: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  profile: IUserProfile;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  stripeCustomerId?: string;
  stripeAccountId?: string; // For creators
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfile {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  photos: string[];
  birthDate?: Date;
  location?: {
    lat: number;
    lng: number;
  };
  preferences?: Record<string, unknown>;
}

// Match Interface
export interface IMatch {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
  status: MatchStatus;
}

// Swipe Interface
export interface ISwipe {
  id: string;
  swiperId: string;
  swipedId: string;
  action: 'like' | 'pass' | 'super_like';
  createdAt: Date;
}

// Subscription Interface
export interface ISubscription {
  id: string;
  subscriberId: string;
  creatorId: string;
  tierId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  cancelledAt?: Date;
}

// Post Interface
export interface IPost {
  id: string;
  creatorId: string;
  contentType: 'text' | 'image' | 'video';
  caption?: string;
  mediaUrls: string[];
  visibility: ContentVisibility;
  requiredTierId?: string;
  ppvPrice?: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}

// Kafka Event Payloads
export interface IMatchedEvent {
  matchId: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
}

export interface ISubscriptionCreatedEvent {
  subscriptionId: string;
  subscriberId: string;
  creatorId: string;
  tierId: string;
  amount: number;
}

export interface IPaymentCompletedEvent {
  transactionId: string;
  userId: string;
  amount: number;
  type: 'subscription' | 'tip' | 'ppv';
  referenceId: string;
}
