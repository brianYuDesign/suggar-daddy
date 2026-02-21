import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  SwipeRequestDto,
  type SwipeAction,
  type SwipeResponseDto,
  type CardsResponseDto,
  type MatchesResponseDto,
  type CardDetailResponseDto,
  type LikesMeResponseDto,
  type RevealLikeResponseDto,
  type UndoResponseDto,
  type BehaviorBatchResponseDto,
  type BehaviorEventDto,
  type GetCardsQuery,
} from '@suggar-daddy/dto';
import {
  JwtAuthGuard,
  CurrentUser,
  type CurrentUserData,
} from '@suggar-daddy/auth';
import { MatchingService } from './matching.service';
import { DiscoveryService } from './discovery.service';
import { SwipeService } from './swipe.service';
import { LikesMeService } from './likes-me.service';
import { BehaviorService } from './behavior.service';
import { SubscriptionServiceClient } from './subscription-service.client';

@Controller()
export class MatchingController {
  private readonly logger = new Logger(MatchingController.name);

  constructor(
    private readonly matchingService: MatchingService,
    private readonly discoveryService: DiscoveryService,
    private readonly swipeService: SwipeService,
    private readonly likesMeService: LikesMeService,
    private readonly behaviorService: BehaviorService,
    private readonly subscriptionClient: SubscriptionServiceClient,
  ) {}

  @Post('swipe')
  @UseGuards(JwtAuthGuard)
  async swipe(
    @CurrentUser() user: CurrentUserData,
    @Body() body: SwipeRequestDto,
  ): Promise<SwipeResponseDto> {
    const swiperId = user.userId;
    this.logger.log(
      `swipe request swiperId=${swiperId} targetUserId=${body.targetUserId} action=${body.action}`,
    );
    const result = await this.swipeService.swipe(
      swiperId,
      body.targetUserId,
      body.action as SwipeAction,
    );
    this.logger.log(
      `swipe result swiperId=${swiperId} targetUserId=${body.targetUserId} matched=${result.matched}${result.matched ? ` matchId=${result.matchId}` : ''}`,
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
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
    @Query('userType') userType?: 'sugar_daddy' | 'sugar_baby',
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('onlineRecently') onlineRecently?: string,
    @Query('tags') tags?: string,
  ): Promise<CardsResponseDto> {
    const uid = user.userId;
    const query: GetCardsQuery = {
      limit: parseInt(limit, 10) || 20,
      cursor,
      radius: radius ? parseInt(radius, 10) || undefined : undefined,
      ageMin: ageMin ? parseInt(ageMin, 10) || undefined : undefined,
      ageMax: ageMax ? parseInt(ageMax, 10) || undefined : undefined,
      userType,
      verifiedOnly: verifiedOnly === 'true',
      onlineRecently: onlineRecently === 'true',
      tags,
    };
    this.logger.log(
      `getCards userId=${uid} limit=${query.limit} radius=${query.radius ?? 'default'} cursor=${cursor ?? 'none'}`,
    );
    const result = await this.discoveryService.getCards(uid, query);
    this.logger.log(
      `getCards result userId=${uid} cardsCount=${result.cards.length} nextCursor=${result.nextCursor ?? 'none'}`,
    );
    return result;
  }

  @Get('cards/:userId/detail')
  @UseGuards(JwtAuthGuard)
  async getCardDetail(
    @CurrentUser() user: CurrentUserData,
    @Param('userId') targetUserId: string,
  ): Promise<CardDetailResponseDto> {
    const viewerId = user.userId;
    this.logger.log(
      `getCardDetail viewerId=${viewerId} targetUserId=${targetUserId}`,
    );
    const result = await this.discoveryService.getCardDetail(
      viewerId,
      targetUserId,
    );
    this.logger.log(
      `getCardDetail result viewerId=${viewerId} targetUserId=${targetUserId} score=${result.compatibilityScore}`,
    );
    return result;
  }

  @Get('matches')
  @UseGuards(JwtAuthGuard)
  async getMatches(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string,
  ): Promise<MatchesResponseDto> {
    const uid = user.userId;
    this.logger.log(
      `getMatches userId=${uid} limit=${limit} cursor=${cursor ?? 'none'}`,
    );
    const result = await this.matchingService.getMatches(
      uid,
      parseInt(limit, 10) || 20,
      cursor,
    );
    this.logger.log(
      `getMatches result userId=${uid} matchesCount=${result.matches.length} nextCursor=${result.nextCursor ?? 'none'}`,
    );
    return result;
  }

  @Delete('matches/:matchId')
  @UseGuards(JwtAuthGuard)
  async unmatch(
    @CurrentUser() user: CurrentUserData,
    @Param('matchId') matchId: string,
  ): Promise<{ success: boolean }> {
    const uid = user.userId;
    this.logger.log(`unmatch request userId=${uid} matchId=${matchId}`);
    const result = await this.matchingService.unmatch(uid, matchId);
    this.logger.log(
      `unmatch result userId=${uid} matchId=${matchId} success=${result.success}`,
    );
    return result;
  }

  @Post('boost')
  @UseGuards(JwtAuthGuard)
  async activateBoost(
    @CurrentUser() user: CurrentUserData,
    @Headers('authorization') authHeader: string,
  ): Promise<{ expiresAt: string; cost: number }> {
    const uid = user.userId;
    const token = authHeader?.replace('Bearer ', '') || '';
    this.logger.log(`boost request userId=${uid}`);
    const result = await this.matchingService.applyBoost(uid, token);
    this.logger.log(
      `boost result userId=${uid} cost=${result.cost} expiresAt=${result.expiresAt}`,
    );
    return result;
  }

  @Get('likes-me')
  @UseGuards(JwtAuthGuard)
  async getLikesMe(
    @CurrentUser() user: CurrentUserData,
    @Headers('authorization') authHeader: string,
    @Query('limit') limit = '20',
    @Query('cursor') cursor?: string,
  ): Promise<LikesMeResponseDto> {
    const uid = user.userId;
    const token = authHeader?.replace('Bearer ', '') || '';
    this.logger.log(
      `getLikesMe userId=${uid} limit=${limit} cursor=${cursor ?? 'none'}`,
    );

    // Check subscription status
    const tierInfo = await this.subscriptionClient.getUserTier(uid, token);

    const result = await this.likesMeService.getLikes(
      uid,
      tierInfo.isSubscriber,
      parseInt(limit, 10) || 20,
      cursor,
    );
    this.logger.log(
      `getLikesMe result userId=${uid} count=${result.count} cardsCount=${result.cards.length}`,
    );
    return result;
  }

  @Post('likes-me/reveal')
  @UseGuards(JwtAuthGuard)
  async revealLike(
    @CurrentUser() user: CurrentUserData,
    @Headers('authorization') authHeader: string,
    @Body() body: { likerId: string },
  ): Promise<RevealLikeResponseDto> {
    const uid = user.userId;
    const token = authHeader?.replace('Bearer ', '') || '';
    this.logger.log(
      `revealLike userId=${uid} likerId=${body.likerId}`,
    );
    const result = await this.likesMeService.reveal(
      uid,
      body.likerId,
      token,
    );
    this.logger.log(
      `revealLike result userId=${uid} likerId=${body.likerId} cost=${result.diamondCost}`,
    );
    return result;
  }

  @Post('undo')
  @UseGuards(JwtAuthGuard)
  async undo(
    @CurrentUser() user: CurrentUserData,
    @Headers('authorization') authHeader: string,
  ): Promise<UndoResponseDto> {
    const uid = user.userId;
    const token = authHeader?.replace('Bearer ', '') || '';
    this.logger.log(`undo request userId=${uid}`);
    const result = await this.swipeService.undo(uid, token);
    this.logger.log(
      `undo result userId=${uid} undone=${result.undone} matchRevoked=${result.matchRevoked}`,
    );
    return result;
  }

  @Post('behavior')
  @UseGuards(JwtAuthGuard)
  async ingestBehavior(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { events: BehaviorEventDto[] },
  ): Promise<BehaviorBatchResponseDto> {
    const uid = user.userId;
    this.logger.log(
      `behavior ingest userId=${uid} eventCount=${body.events?.length ?? 0}`,
    );
    const result = await this.behaviorService.ingest(uid, body.events);
    this.logger.log(
      `behavior result userId=${uid} accepted=${result.accepted} rejected=${result.rejected}`,
    );
    return result;
  }
}
