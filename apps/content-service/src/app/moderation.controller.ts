import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';

@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // ── User-facing: Report content ─────────────────────────────────

  @Post('report')
  @UseGuards(JwtAuthGuard)
  reportPost(
    @CurrentUser() user: CurrentUserData,
    @Body() body: {
      postId: string;
      reason: 'spam' | 'nudity' | 'harassment' | 'violence' | 'copyright' | 'other';
      description?: string;
    },
  ) {
    return this.moderationService.reportPost(
      user.userId,
      body.postId,
      body.reason,
      body.description,
    );
  }

  // ── Admin: Moderation queue ─────────────────────────────────────

  @Get('queue')
  @UseGuards(JwtAuthGuard)
  getReportQueue(@Query('limit') limitStr?: string) {
    // TODO: Add @Roles('ADMIN') guard
    const limit = Math.min(100, parseInt(limitStr || '50', 10) || 50);
    return this.moderationService.getReportQueue(limit);
  }

  @Get('reports/:postId')
  @UseGuards(JwtAuthGuard)
  getReportsForPost(@Param('postId') postId: string) {
    // TODO: Add @Roles('ADMIN') guard
    return this.moderationService.getReportsForPost(postId);
  }

  @Put('review/:reportId')
  @UseGuards(JwtAuthGuard)
  reviewReport(
    @CurrentUser() user: CurrentUserData,
    @Param('reportId') reportId: string,
    @Body() body: { action: 'dismiss' | 'takedown' },
  ) {
    // TODO: Add @Roles('ADMIN') guard
    return this.moderationService.reviewReport(reportId, body.action, user.userId);
  }

  @Post('takedown/:postId')
  @UseGuards(JwtAuthGuard)
  takeDownPost(
    @CurrentUser() user: CurrentUserData,
    @Param('postId') postId: string,
  ) {
    // TODO: Add @Roles('ADMIN') guard
    return this.moderationService.takeDownPost(postId, user.userId);
  }

  @Post('reinstate/:postId')
  @UseGuards(JwtAuthGuard)
  reinstatePost(
    @CurrentUser() user: CurrentUserData,
    @Param('postId') postId: string,
  ) {
    // TODO: Add @Roles('ADMIN') guard
    return this.moderationService.reinstatePost(postId, user.userId);
  }

  @Get('taken-down')
  @UseGuards(JwtAuthGuard)
  getTakenDownPosts() {
    // TODO: Add @Roles('ADMIN') guard
    return this.moderationService.getTakenDownPosts();
  }
}
