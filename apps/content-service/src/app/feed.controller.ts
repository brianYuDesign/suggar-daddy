import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { FeedService } from './feed.service';

@Controller('posts')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  getFeed(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.feedService.getFeed(user.userId, Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }
}
