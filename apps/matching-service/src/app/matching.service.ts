import { Injectable, Logger } from '@nestjs/common';
import type {
  UserCardDto,
  MatchDto,
  SwipeResponseDto,
  SwipeAction,
  CardsResponseDto,
  MatchesResponseDto,
} from '@suggar-daddy/dto';

// 架構：讀取 Redis，寫入 Kafka。不操作 DB。
// In-memory mock（將由 Redis + Kafka 取代）
interface SwipeRecord {
  swiperId: string;
  swipedId: string;
  action: SwipeAction;
  createdAt: Date;
}

interface MatchRecord {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
  status: 'active' | 'unmatched' | 'blocked';
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private swipes: SwipeRecord[] = [];
  private matches: MatchRecord[] = [];
  private mockCards: UserCardDto[] = this.createMockCards();

  private createMockCards(): UserCardDto[] {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `user-${i + 1}`,
      displayName: `User ${i + 1}`,
      bio: `Bio for user ${i + 1}`,
      avatarUrl: undefined,
      role: i % 2 === 0 ? 'sugar_baby' : 'sugar_daddy',
      verificationStatus: 'unverified',
      lastActiveAt: new Date(Date.now() - i * 3600000),
    }));
  }

  async swipe(
    swiperId: string,
    targetUserId: string,
    action: SwipeAction
  ): Promise<SwipeResponseDto> {
    const existing = this.swipes.find(
      (s) => s.swiperId === swiperId && s.swipedId === targetUserId
    );
    if (!existing) {
      this.swipes.push({
        swiperId,
        swipedId: targetUserId,
        action,
        createdAt: new Date(),
      });
      this.logger.log(`swipe recorded swiperId=${swiperId} targetUserId=${targetUserId} action=${action}`);
    }

    if (action === 'like' || action === 'super_like') {
      const mutualLike = this.swipes.some(
        (s) =>
          s.swiperId === targetUserId &&
          s.swipedId === swiperId &&
          (s.action === 'like' || s.action === 'super_like')
      );
      if (mutualLike) {
        const existingMatch = this.matches.find(
          (m) =>
            (m.userAId === swiperId && m.userBId === targetUserId) ||
            (m.userAId === targetUserId && m.userBId === swiperId)
        );
        if (!existingMatch) {
          const match: MatchRecord = {
            id: `match-${Date.now()}`,
            userAId: swiperId,
            userBId: targetUserId,
            matchedAt: new Date(),
            status: 'active',
          };
          this.matches.push(match);
          this.logger.log(`match created matchId=${match.id} userA=${swiperId} userB=${targetUserId}`);
          return { matched: true, matchId: match.id };
        }
        this.logger.log(`mutual like (existing match) matchId=${existingMatch.id} swiperId=${swiperId} targetUserId=${targetUserId}`);
        return { matched: true, matchId: existingMatch.id };
      }
    }
    return { matched: false };
  }

  async getCards(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<CardsResponseDto> {
    const swipedIds = new Set(
      this.swipes.filter((s) => s.swiperId === userId).map((s) => s.swipedId)
    );
    const available = this.mockCards.filter(
      (c) => c.id !== userId && !swipedIds.has(c.id)
    );

    let start = 0;
    if (cursor) {
      const idx = available.findIndex((c) => c.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = available.slice(start, start + limit);
    const nextCursor =
      start + limit < available.length ? slice[slice.length - 1]?.id : undefined;

    return {
      cards: slice,
      nextCursor,
    };
  }

  async getMatches(
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<MatchesResponseDto> {
    const userMatches = this.matches.filter(
      (m) =>
        (m.userAId === userId || m.userBId === userId) && m.status === 'active'
    );

    let start = 0;
    if (cursor) {
      const idx = userMatches.findIndex((m) => m.id === cursor);
      start = idx >= 0 ? idx + 1 : 0;
    }
    const slice = userMatches.slice(start, start + limit);
    const nextCursor =
      start + limit < userMatches.length
        ? slice[slice.length - 1]?.id
        : undefined;

    const matches: MatchDto[] = slice.map((m) => ({
      id: m.id,
      userAId: m.userAId,
      userBId: m.userBId,
      matchedAt: m.matchedAt,
      status: m.status,
    }));

    return {
      matches,
      nextCursor,
    };
  }

  async unmatch(userId: string, matchId: string): Promise<{ success: boolean }> {
    const match = this.matches.find(
      (m) =>
        m.id === matchId &&
        (m.userAId === userId || m.userBId === userId) &&
        m.status === 'active'
    );
    if (match) {
      match.status = 'unmatched';
      this.logger.log(`unmatch applied userId=${userId} matchId=${matchId}`);
      return { success: true };
    }
    this.logger.warn(`unmatch failed (not found or not owner) userId=${userId} matchId=${matchId}`);
    return { success: false };
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'matching-service' };
  }
}
