import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { SwipeRequestDto, SwipeAction } from '@suggar-daddy/dto';
import { MatchingService } from './matching.service';

@Controller()
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}

  @Post('swipe')
  async swipe(
    @Body() body: SwipeRequestDto,
    @Query('userId') userId: string
  ) {
    // TODO: 從 JWT/Auth 取得 userId
    const swiperId = userId || 'mock-user-id';
    this.logger.log(
      `swipe request swiperId=${swiperId} targetUserId=${body.targetUserId} action=${body.action}`
    );
    const result = await this.matchingService.swipe(
      swiperId,
      body.targetUserId,
      body.action as SwipeAction
    );
    this.logger.log(
      `swipe result swiperId=${swiperId} targetUserId=${body.targetUserId} matched=${result.matched}${result.matched ? ` matchId=${result.matchId}` : ''}`
    );
    return result;
  }

  @Get('cards')
  async getCards(
    @Query('userId') userId: string,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string
  ) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`getCards userId=${uid} limit=${limit} cursor=${cursor ?? 'none'}`);
    const result = await this.matchingService.getCards(uid, parseInt(limit, 10) || 20, cursor);
    this.logger.log(`getCards result userId=${uid} cardsCount=${result.cards.length} nextCursor=${result.nextCursor ?? 'none'}`);
    return result;
  }

  @Get('matches')
  async getMatches(
    @Query('userId') userId: string,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string
  ) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`getMatches userId=${uid} limit=${limit} cursor=${cursor ?? 'none'}`);
    const result = await this.matchingService.getMatches(uid, parseInt(limit, 10) || 20, cursor);
    this.logger.log(`getMatches result userId=${uid} matchesCount=${result.matches.length} nextCursor=${result.nextCursor ?? 'none'}`);
    return result;
  }

  @Delete('matches/:matchId')
  async unmatch(
    @Param('matchId') matchId: string,
    @Query('userId') userId: string
  ) {
    const uid = userId || 'mock-user-id';
    this.logger.log(`unmatch request userId=${uid} matchId=${matchId}`);
    const result = await this.matchingService.unmatch(uid, matchId);
    this.logger.log(`unmatch result userId=${uid} matchId=${matchId} success=${result.success}`);
    return result;
  }
}
