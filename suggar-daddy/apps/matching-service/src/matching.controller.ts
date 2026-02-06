import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, EventPattern } from '@nestjs/microservices';
import { MatchingService } from './matching.service';

interface SwipePayload {
  userId: string;
  targetUserId: string;
  action: 'like' | 'pass' | 'super_like';
}

interface GetCardsPayload {
  userId: string;
  limit: number;
}

interface GetMatchesPayload {
  userId: string;
  limit: number;
  cursor?: string;
}

interface UnmatchPayload {
  userId: string;
  matchId: string;
}

@Controller()
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}

  @MessagePattern('matching.swipe')
  async handleSwipe(@Payload() payload: SwipePayload) {
    this.logger.log(`Swipe: ${payload.userId} -> ${payload.targetUserId} (${payload.action})`);
    return this.matchingService.swipe(
      payload.userId,
      payload.targetUserId,
      payload.action,
    );
  }

  @MessagePattern('matching.getCards')
  async handleGetCards(@Payload() payload: GetCardsPayload) {
    this.logger.log(`GetCards: ${payload.userId}, limit: ${payload.limit}`);
    return this.matchingService.getCards(payload.userId, payload.limit);
  }

  @MessagePattern('matching.getMatches')
  async handleGetMatches(@Payload() payload: GetMatchesPayload) {
    this.logger.log(`GetMatches: ${payload.userId}`);
    return this.matchingService.getMatches(payload.userId, payload.limit, payload.cursor);
  }

  @MessagePattern('matching.unmatch')
  async handleUnmatch(@Payload() payload: UnmatchPayload) {
    this.logger.log(`Unmatch: ${payload.userId}, matchId: ${payload.matchId}`);
    return this.matchingService.unmatch(payload.userId, payload.matchId);
  }

  @EventPattern('user.updated')
  async handleUserUpdated(@Payload() payload: { userId: string }) {
    this.logger.log(`User updated: ${payload.userId}`);
    // Invalidate cached cards for this user
    await this.matchingService.invalidateUserCards(payload.userId);
  }
}
