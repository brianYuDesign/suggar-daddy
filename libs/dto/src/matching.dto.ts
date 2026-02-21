/**
 * Matching 相關 DTO
 */
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import type { UserCardDto } from './user.dto';
import type { UserType } from '@suggar-daddy/common';

export type SwipeAction = 'like' | 'pass' | 'super_like';

export class SwipeRequestDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;

  @IsIn(['like', 'pass', 'super_like'])
  action: SwipeAction;
}

export interface SwipeResponseDto {
  matched: boolean;
  matchId?: string;
}

export interface MatchDto {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
  status: string;
}

// ── Interest Tags ─────────────────────────────────────────────

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

// ── Enhanced Card DTOs ────────────────────────────────────────

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

export interface MatchesResponseDto {
  matches: MatchDto[];
  nextCursor?: string;
}

// ── Card Detail ───────────────────────────────────────────────

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

// ── Who Liked Me ──────────────────────────────────────────────

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

export interface RevealLikeRequestDto {
  likerId: string;
}

export interface RevealLikeResponseDto {
  card: EnhancedUserCardDto;
  diamondCost: number;
  diamondBalance: number;
}

// ── Undo ──────────────────────────────────────────────────────

export interface UndoResponseDto {
  undone: boolean;
  card?: EnhancedUserCardDto;
  matchRevoked: boolean;
  diamondCost: number;
  freeUndosRemaining: number;
}

// ── Behavior Tracking ─────────────────────────────────────────

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
    action?: SwipeAction;
    durationMs?: number;
    photosViewed?: number;
    [key: string]: unknown;
  };
  timestamp: number;
}

export interface BehaviorBatchDto {
  events: BehaviorEventDto[];
}

export interface BehaviorBatchResponseDto {
  accepted: number;
  rejected: number;
}

// ── Discovery Filters ─────────────────────────────────────────

export interface GetCardsQuery {
  limit?: number;
  cursor?: string;
  radius?: number;
  ageMin?: number;
  ageMax?: number;
  userType?: 'sugar_daddy' | 'sugar_baby';
  verifiedOnly?: boolean;
  onlineRecently?: boolean;
  tags?: string;
}
