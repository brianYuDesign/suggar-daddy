/**
 * Matching 相關 DTO
 */

import type { UserCardDto } from './user.dto';

export type SwipeAction = 'like' | 'pass' | 'super_like';

export interface SwipeRequestDto {
  targetUserId: string;
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

export interface CardsResponseDto {
  cards: UserCardDto[];
  nextCursor?: string;
}

export interface MatchesResponseDto {
  matches: MatchDto[];
  nextCursor?: string;
}
