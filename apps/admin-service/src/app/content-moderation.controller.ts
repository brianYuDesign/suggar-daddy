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
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@suggar-daddy/common';
import { ContentModerationService } from './content-moderation.service';

@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ContentModerationController {
  constructor(
    private readonly contentModerationService: ContentModerationService,
  ) {}

  /** GET /api/v1/admin/content/reports - 分頁查詢檢舉紀錄 */
  @Get('reports')
  listReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.contentModerationService.listReports(page, limit, status);
  }

  /** GET /api/v1/admin/content/reports/:reportId - 取得單一檢舉詳情 */
  @Get('reports/:reportId')
  getReportDetail(@Param('reportId') reportId: string) {
    return this.contentModerationService.getReportDetail(reportId);
  }

  /** POST /api/v1/admin/content/posts/:postId/take-down - 下架費文 */
  @Post('posts/:postId/take-down')
  takeDownPost(
    @Param('postId') postId: string,
    @Body('reason') reason: string,
  ) {
    return this.contentModerationService.takeDownPost(postId, reason);
  }

  /** POST /api/v1/admin/content/posts/:postId/reinstate - 恢復已下架費文 */
  @Post('posts/:postId/reinstate')
  reinstatePost(@Param('postId') postId: string) {
    return this.contentModerationService.reinstatePost(postId);
  }

  /** GET /api/v1/admin/content/stats - 取得內容統計 */
  @Get('stats')
  getContentStats() {
    return this.contentModerationService.getContentStats();
  }

  /** GET /api/v1/admin/content/posts — 分頁查詢所有貼文 */
  @Get('posts')
  listPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('visibility') visibility?: string,
    @Query('search') search?: string,
  ) {
    return this.contentModerationService.listPosts(page, limit, visibility, search);
  }
}
