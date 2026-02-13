import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SwipeRequestDto } from '@suggar-daddy/dto';
import type { SwipeAction } from '@suggar-daddy/dto';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { MatchingService } from './matching.service';

@Controller()
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(private readonly matchingService: MatchingService) {}

  @Post('swipe')
  @UseGuards(JwtAuthGuard)
  async swipe(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SwipeRequestDto
  ) {
    const swiperId = user.userId;
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
  @UseGuards(JwtAuthGuard)
  async getCards(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string,
    @Query('radius') radius?: string,
  ) {
    const uid = user.userId;
    const radiusKm = radius ? parseInt(radius, 10) || undefined : undefined;
    this.logger.log(`getCards userId=${uid} limit=${limit} radius=${radiusKm ?? 'default'} cursor=${cursor ?? 'none'}`);
    const result = await this.matchingService.getCards(uid, parseInt(limit, 10) || 20, cursor, radiusKm);
    this.logger.log(`getCards result userId=${uid} cardsCount=${result.cards.length} nextCursor=${result.nextCursor ?? 'none'}`);
    return result;
  }

  @Get('matches')
  @UseGuards(JwtAuthGuard)
  async getMatches(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string
  ) {
    const uid = user.userId;
    this.logger.log(`getMatches userId=${uid} limit=${limit} cursor=${cursor ?? 'none'}`);
    const result = await this.matchingService.getMatches(uid, parseInt(limit, 10) || 20, cursor);
    this.logger.log(`getMatches result userId=${uid} matchesCount=${result.matches.length} nextCursor=${result.nextCursor ?? 'none'}`);
    return result;
  }

  @Delete('matches/:matchId')
  @UseGuards(JwtAuthGuard)
  async unmatch(
    @CurrentUser() user: CurrentUserData,
    @Param('matchId') matchId: string
  ) {
    const uid = user.userId;
    this.logger.log(`unmatch request userId=${uid} matchId=${matchId}`);
    const result = await this.matchingService.unmatch(uid, matchId);
    this.logger.log(`unmatch result userId=${uid} matchId=${matchId} success=${result.success}`);
    return result;
  }
}
