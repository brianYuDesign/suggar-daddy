import type { ApiClient } from './client';
import type {
  SwipeRequestDto,
  SwipeResponseDto,
  MatchesResponseDto,
  UserCardDto,
  UserType,
} from './types';

// ==================== Interest Tags ====================

export type InterestTagCategory =
  | 'lifestyle'
  | 'interests'
  | 'expectations'
  | 'personality';

export interface InterestTagDto {
  id: string;
  category: InterestTagCategory;
  name: string;
  nameZh?: string;
  icon?: string;
  isCommon?: boolean;
}

// ==================== Enhanced Matching Types ====================

export interface GetCardsQuery {
  cursor?: string;
  limit?: number;
  radius?: number;
  ageMin?: number;
  ageMax?: number;
  userType?: string;
  verifiedOnly?: boolean;
  onlineRecently?: boolean;
  tags?: string;
}

export interface EnhancedUserCardDto extends UserCardDto {
  age?: number;
  compatibilityScore: number;
  commonTagCount: number;
  isBoosted: boolean;
  isSuperLiked?: boolean;
  tags: InterestTagDto[];
}

export interface CardsResponseDto {
  cards: EnhancedUserCardDto[];
  nextCursor?: string;
  totalEstimate?: number;
}

// ==================== Card Detail ====================

export interface PostPreviewDto {
  id: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
}

export interface ScoreBreakdownDto {
  userTypeMatch: number;
  distanceScore: number;
  ageScore: number;
  tagScore: number;
  behaviorScore: number;
}

export interface CardDetailResponseDto {
  id: string;
  username?: string;
  displayName: string;
  age?: number;
  bio?: string;
  avatarUrl?: string;
  userType: UserType;
  verificationStatus: string;
  city?: string;
  distance?: number;
  lastActiveAt?: Date;
  compatibilityScore: number;
  photos: string[];
  tags: InterestTagDto[];
  commonTagCount: number;
  recentPosts: PostPreviewDto[];
  scoreBreakdown?: ScoreBreakdownDto;
}

// ==================== Who Liked Me ====================

export interface LikesMeCardDto {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  isBlurred: boolean;
  isSuperLike: boolean;
  likedAt: Date;
  age?: number;
  city?: string;
  compatibilityScore?: number;
  userType?: UserType;
}

export interface LikesMeResponseDto {
  count: number;
  cards: LikesMeCardDto[];
  nextCursor?: string;
}

export interface RevealLikeResponseDto {
  card: EnhancedUserCardDto;
  diamondCost: number;
  diamondBalance: number;
}

// ==================== Undo ====================

export interface UndoResponseDto {
  undone: boolean;
  card?: EnhancedUserCardDto;
  matchRevoked: boolean;
  diamondCost: number;
  freeUndosRemaining: number;
}

// ==================== Behavior Tracking ====================

export type BehaviorEventType =
  | 'swipe'
  | 'view_card'
  | 'view_detail'
  | 'view_photo'
  | 'dwell_card'
  | 'dwell_detail';

export interface BehaviorEventDto {
  eventType: BehaviorEventType;
  targetUserId: string;
  metadata: {
    action?: 'like' | 'pass' | 'super_like';
    durationMs?: number;
    photosViewed?: number;
    [key: string]: unknown;
  };
  timestamp: number;
}

export interface BehaviorBatchResponseDto {
  accepted: number;
  rejected: number;
}

// ==================== API Class ====================

export class MatchingApi {
  constructor(private readonly client: ApiClient) {}

  /**
   * Get discovery cards with optional filter params
   * @param params - Optional filter parameters for cards
   * @returns Cards response with cursor pagination
   */
  getCards(params?: GetCardsQuery) {
    const queryParams: Record<string, string> = {};
    if (params) {
      if (params.cursor) queryParams.cursor = params.cursor;
      if (params.limit !== undefined) queryParams.limit = String(params.limit);
      if (params.radius !== undefined) queryParams.radius = String(params.radius);
      if (params.ageMin !== undefined) queryParams.ageMin = String(params.ageMin);
      if (params.ageMax !== undefined) queryParams.ageMax = String(params.ageMax);
      if (params.userType) queryParams.userType = params.userType;
      if (params.verifiedOnly !== undefined) queryParams.verifiedOnly = String(params.verifiedOnly);
      if (params.onlineRecently !== undefined) queryParams.onlineRecently = String(params.onlineRecently);
      if (params.tags) queryParams.tags = params.tags;
    }
    const config = Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined;
    return this.client.get<CardsResponseDto>('/api/matching/cards', config);
  }

  /**
   * Get detailed card information for a specific user
   * @param userId - ID of the user to get card detail for
   * @returns Detailed card information including photos and tags
   */
  getCardDetail(userId: string) {
    return this.client.get<CardDetailResponseDto>(`/api/matching/cards/${userId}`);
  }

  /**
   * Record a swipe action (like, pass, or super_like)
   * @param dto - Swipe request containing target user and action
   * @returns Whether a match was created
   */
  swipe(dto: SwipeRequestDto) {
    return this.client.post<SwipeResponseDto>('/api/matching/swipe', dto);
  }

  /**
   * Get the current user's matches with cursor pagination
   * @param cursor - Optional cursor for pagination
   * @returns Matches list with cursor pagination
   */
  getMatches(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<MatchesResponseDto>('/api/matching/matches', { params });
  }

  /**
   * Activate a profile boost using diamonds
   * @returns Boost expiration time and diamond cost
   */
  activateBoost() {
    return this.client.post<{ expiresAt: string; cost: number }>('/api/matching/boost', {});
  }

  /**
   * Send a super like to a user (costs diamonds)
   * @param targetUserId - ID of the user to super like
   * @returns Swipe response with optional diamond cost
   */
  superLike(targetUserId: string) {
    return this.client.post<SwipeResponseDto & { diamondCost?: number }>(
      '/api/matching/swipe',
      { targetUserId, action: 'super_like' },
    );
  }

  /**
   * Get users who have liked the current user
   * @param cursor - Optional cursor for pagination
   * @returns List of users who liked you, with reveal status
   */
  getLikesMe(cursor?: string) {
    const params = cursor ? { cursor } : undefined;
    return this.client.get<LikesMeResponseDto>('/api/matching/likes-me', { params });
  }

  /**
   * Reveal a blurred like (costs diamonds)
   * @param likerId - ID of the user whose like to reveal
   * @returns Revealed user card and diamond cost
   */
  revealLike(likerId: string) {
    return this.client.post<RevealLikeResponseDto>(`/api/matching/likes-me/${likerId}/reveal`, {});
  }

  /**
   * Undo the last swipe action (costs diamonds)
   * @returns Undo result with the undone swipe details
   */
  undo() {
    return this.client.post<UndoResponseDto>('/api/matching/undo', {});
  }

  /**
   * Send a batch of behavior events for recommendation improvement
   * @param events - Array of behavior events to record
   * @returns Count of received and processed events
   */
  sendBehaviorEvents(events: BehaviorEventDto[]) {
    return this.client.post<BehaviorBatchResponseDto>('/api/matching/behavior-events', { events });
  }
}
