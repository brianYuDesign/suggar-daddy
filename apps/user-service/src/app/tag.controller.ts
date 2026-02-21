import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import {
  CurrentUser,
  Public,
  type CurrentUserData,
} from '@suggar-daddy/auth';
import { InjectLogger } from '@suggar-daddy/common';
import { InterestTagEntity } from '@suggar-daddy/database';
import { TagService } from './tag.service';

@Controller()
export class TagController {
  @InjectLogger()
  private readonly logger!: Logger;

  constructor(private readonly tagService: TagService) {}

  /** List all active interest tags (no auth required) */
  @Public()
  @Get('tags')
  async getAllTags(): Promise<InterestTagEntity[]> {
    this.logger.log('getAllTags request');
    return this.tagService.getAllTags();
  }

  /** Update current user's interest tags (replace all, requires auth via global JwtAuthGuard) */
  @Put('me/tags')
  async updateMyTags(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { tagIds: string[] },
  ): Promise<InterestTagEntity[]> {
    this.logger.log(
      `updateMyTags userId=${user.userId} count=${body.tagIds?.length ?? 0}`,
    );
    return this.tagService.updateUserTags(user.userId, body.tagIds ?? []);
  }

  /** Get a user's interest tags */
  @Public()
  @Get(':userId/tags')
  async getUserTags(
    @Param('userId') userId: string,
  ): Promise<InterestTagEntity[]> {
    this.logger.log(`getUserTags userId=${userId}`);
    return this.tagService.getUserTags(userId);
  }

  /** Get common tags between two users (internal use) */
  @Public()
  @Get('internal/common-tags')
  async getCommonTags(
    @Query('userAId') userAId: string,
    @Query('userBId') userBId: string,
  ): Promise<InterestTagEntity[]> {
    this.logger.log(`getCommonTags userAId=${userAId} userBId=${userBId}`);
    return this.tagService.getCommonTags(userAId, userBId);
  }
}
