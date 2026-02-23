/**
 * 內容審核控制器
 * 所有端點僅限 ADMIN 角色存取
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { ContentModerationService } from './content-moderation.service';

@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ContentModerationController {
  constructor(
    private readonly contentModerationService: ContentModerationService,
  ) {}

  /** GET /api/admin/content/reports - 分頁查詢檢舉紀錄 */
  @Get('reports')
  listReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.contentModerationService.listReports(page, limit, status);
  }

  /** POST /api/admin/content/reports/batch/resolve — 批量處理檢舉 */
  @Post('reports/batch/resolve')
  @HttpCode(200)
  batchResolveReports(@Body('reportIds') reportIds: string[]) {
    return this.contentModerationService.batchResolveReports(reportIds);
  }

  /** GET /api/admin/content/reports/:reportId - 取得單一檢舉詳情 */
  @Get('reports/:reportId')
  getReportDetail(@Param('reportId') reportId: string) {
    return this.contentModerationService.getReportDetail(reportId);
  }

  /** POST /api/admin/content/posts/:postId/take-down - 下架費文 */
  @Post('posts/:postId/take-down')
  @HttpCode(200)
  takeDownPost(
    @Param('postId') postId: string,
    @Body('reason') reason: string,
  ) {
    return this.contentModerationService.takeDownPost(postId, reason);
  }

  /** POST /api/admin/content/posts/:postId/reinstate - 恢復已下架費文 */
  @Post('posts/:postId/reinstate')
  @HttpCode(200)
  reinstatePost(@Param('postId') postId: string) {
    return this.contentModerationService.reinstatePost(postId);
  }

  /** GET /api/admin/content/stats - 取得內容統計 */
  @Get('stats')
  getContentStats() {
    return this.contentModerationService.getContentStats();
  }

  /** GET /api/admin/content/posts — 分頁查詢所有貼文 */
  @Get('posts')
  listPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('visibility') visibility?: string,
    @Query('search') search?: string,
  ) {
    return this.contentModerationService.listPosts(page, limit, visibility, search);
  }

  /** GET /api/admin/content/moderation-queue — 自動審核標記佇列 */
  @Get('moderation-queue')
  getModerationQueue(
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.contentModerationService.getModerationQueue(source, status, limit);
  }

  /** POST /api/admin/content/moderation/bulk-action — 批量審核動作 */
  @Post('moderation/bulk-action')
  @HttpCode(200)
  bulkModerationAction(
    @Body() body: { contentIds: string[]; action: 'approve' | 'takedown' },
  ) {
    return this.contentModerationService.bulkModerationAction(body.contentIds, body.action);
  }

  /** GET /api/admin/content/moderation/stats — 審核統計 */
  @Get('moderation/stats')
  getModerationStats() {
    return this.contentModerationService.getModerationStats();
  }

  /** GET /api/admin/content/appeals — 申訴佇列 */
  @Get('appeals')
  getAppeals(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.contentModerationService.getAppeals(page, limit, status);
  }

  /** Post /api/admin/content/appeals/:appealId/resolve — 處理申訴 */
  @Post('appeals/:appealId/resolve')
  @HttpCode(200)
  resolveAppeal(
    @Param('appealId') appealId: string,
    @Body() body: { action: 'grant' | 'deny'; resolutionNote?: string },
  ) {
    return this.contentModerationService.resolveAppeal(appealId, body.action, body.resolutionNote);
  }
}
