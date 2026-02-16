import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtGuard, CurrentUser, Public, type CurrentUserData } from '@suggar-daddy/auth';
import { CreateStoryDto } from '@suggar-daddy/dto';
import { StoryService } from './story.service';

@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateStoryDto,
  ) {
    return this.storyService.createStory(user.userId, dto);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  getStoryFeed(@CurrentUser() user: CurrentUserData) {
    return this.storyService.getStoryFeed(user.userId);
  }

  @Get('creator/:creatorId')
  @UseGuards(OptionalJwtGuard)
  @Public()
  getCreatorStories(
    @Param('creatorId') creatorId: string,
    @CurrentUser() user?: CurrentUserData,
  ) {
    return this.storyService.getCreatorStories(creatorId, user?.userId);
  }

  @Post(':storyId/view')
  @UseGuards(JwtAuthGuard)
  viewStory(
    @Param('storyId') storyId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.storyService.viewStory(storyId, user.userId);
  }

  @Get(':storyId/viewers')
  @UseGuards(JwtAuthGuard)
  getStoryViewers(
    @Param('storyId') storyId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.storyService.getStoryViewers(
      storyId,
      user.userId,
      Number(page) || 1,
      Math.min(Number(limit) || 50, 100),
    );
  }

  @Delete(':storyId')
  @UseGuards(JwtAuthGuard)
  deleteStory(
    @Param('storyId') storyId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.storyService.deleteStory(storyId, user.userId);
  }
}
