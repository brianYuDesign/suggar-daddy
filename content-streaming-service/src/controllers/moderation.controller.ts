import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { ModerationService, ModerationHistoryItem } from '@/services/moderation.service';
import { Roles } from '@/common/roles.decorator';
import { RolesGuard } from '@/common/roles.guard';
import { RoleType } from '@/common/role-type.enum';
import { Content } from '@/entities/content.entity';

// DTOs
export class ApproveContentDto {
  reason?: string;
}

export class RejectContentDto {
  reason: string;
}

export class FlagContentDto {
  reason?: string;
}

export class UnflagContentDto {
  reason?: string;
}

export interface PendingContentResponse {
  data: Content[];
  total: number;
  limit: number;
  offset: number;
}

export interface ModerationHistoryResponse {
  content_id: string;
  history: ModerationHistoryItem[];
}

@Controller('api/content')
@UseGuards(RolesGuard)
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  /**
   * Get pending review content list
   * GET /api/content/pending-review
   */
  @Get('pending-review')
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async getPendingReview(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<PendingContentResponse> {
    const { data, total } = await this.moderationService.getPendingContent(limit, offset);
    return {
      data,
      total,
      limit,
      offset,
    };
  }

  /**
   * Approve content
   * POST /api/content/:id/approve
   */
  @Post(':id/approve')
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async approveContent(
    @Param('id') contentId: string,
    @Body() dto: ApproveContentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<Content> {
    const adminId = req.user?.id || 'admin-1';
    return this.moderationService.approveContent(contentId, adminId, dto.reason);
  }

  /**
   * Reject content
   * POST /api/content/:id/reject
   */
  @Post(':id/reject')
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async rejectContent(
    @Param('id') contentId: string,
    @Body() dto: RejectContentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<Content> {
    const adminId = req.user?.id || 'admin-1';
    return this.moderationService.rejectContent(contentId, adminId, dto.reason);
  }

  /**
   * Get reports list
   * GET /api/content/reports
   */
  @Get('reports')
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async getReports(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<PendingContentResponse> {
    const { data, total } = await this.moderationService.getReports(limit, offset);
    return {
      data,
      total,
      limit,
      offset,
    };
  }

  /**
   * Flag content
   * POST /api/content/:id/flag
   */
  @Post(':id/flag')
  async flagContent(
    @Param('id') contentId: string,
    @Body() dto: FlagContentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<Content> {
    const reporterId = req.user?.id;
    return this.moderationService.flagContent(contentId, dto.reason, reporterId);
  }

  /**
   * Unflag content
   * POST /api/content/:id/unflag
   */
  @Post(':id/unflag')
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async unflagContent(
    @Param('id') contentId: string,
    @Body() dto: UnflagContentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<Content> {
    const adminId = req.user?.id || 'admin-1';
    return this.moderationService.unflagContent(contentId, adminId, dto.reason);
  }

  /**
   * Get moderation history
   * GET /api/content/:id/moderation-history
   */
  @Get(':id/moderation-history')
  @Roles(RoleType.ADMIN, RoleType.MODERATOR)
  async getModerationHistory(
    @Param('id') contentId: string,
  ): Promise<ModerationHistoryResponse> {
    const history = await this.moderationService.getModerationHistory(contentId);
    return {
      content_id: contentId,
      history,
    };
  }
}
