import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AppealService, ContentAppeal } from './appeal.service';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard, type CurrentUserData } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { ModerationService } from './moderation.service';

@Controller('moderation')
export class AppealController {
  constructor(
    private readonly appealService: AppealService,
    private readonly moderationService: ModerationService,
  ) {}

  // ── User-facing: Submit appeal ────────────────────────────────────

  @Post('appeal')
  @UseGuards(JwtAuthGuard)
  submitAppeal(
    @CurrentUser() user: CurrentUserData,
    @Body() body: {
      contentId: string;
      contentType: 'post' | 'comment' | 'story' | 'bio';
      reason: string;
    },
  ): Promise<ContentAppeal> {
    return this.appealService.submitAppeal(
      user.userId,
      body.contentId,
      body.contentType,
      body.reason,
    );
  }

  // ── Admin: Appeal management ──────────────────────────────────────

  @Get('appeals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAppealQueue(@Query('limit') limitStr?: string): Promise<ContentAppeal[]> {
    const limit = Math.min(100, parseInt(limitStr || '50', 10) || 50);
    return this.appealService.getAppealQueue(limit);
  }

  @Get('appeals/:appealId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAppeal(@Param('appealId') appealId: string): Promise<ContentAppeal> {
    return this.appealService.getAppeal(appealId);
  }

  @Put('appeals/:appealId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reviewAppeal(
    @CurrentUser() user: CurrentUserData,
    @Param('appealId') appealId: string,
    @Body() body: { action: 'grant' | 'deny'; resolutionNote?: string },
  ): Promise<ContentAppeal> {
    const appeal = await this.appealService.reviewAppeal(
      appealId,
      body.action,
      user.userId,
      body.resolutionNote,
    );

    // If granted and content is a post, reinstate it
    if (body.action === 'grant' && appeal.contentType === 'post') {
      await this.moderationService.reinstatePost(appeal.contentId, user.userId);
    }

    return appeal;
  }

  @Get('appeals/content/:contentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAppealsByContent(@Param('contentId') contentId: string): Promise<ContentAppeal[]> {
    return this.appealService.getAppealsByContent(contentId);
  }
}
