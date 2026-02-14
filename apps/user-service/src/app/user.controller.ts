import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  ForbiddenException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CreateUserDto, UpdateProfileDto, LocationUpdateDto, UserProfileDto, UserCardDto, FollowerDto, FollowStatusDto, RecommendedCreatorDto } from '@suggar-daddy/dto';
import { CurrentUser, Public, Roles, RolesGuard, UserRole, JwtAuthGuard, OptionalJwtGuard, type CurrentUserData } from '@suggar-daddy/common';
import { UserService } from './user.service';
import { ReportService } from './report.service';
import type { ReportRecord } from './user.types';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly reportService: ReportService,
  ) {}

  /** 取得當前用戶完整資料（從 JWT 取 userId） */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserData): Promise<UserProfileDto> {
    const uid = user.userId;
    this.logger.log(`getMe request userId=${uid}`);
    const profile = await this.userService.getMe(uid);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  /** 取得推薦用卡片（exclude 逗號分隔的 userId，供 matching-service 使用） */
  @UseGuards(OptionalJwtGuard)
  @Get('cards')
  async getCards(
    @Query('exclude') excludeStr?: string,
    @Query('limit') limitStr?: string
  ): Promise<UserCardDto[]> {
    const exclude = excludeStr ? excludeStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    return this.userService.getCardsForRecommendation(exclude, limit);
  }

  // ── Follow / Unfollow ──────────────────────────────────────────

  @Get('follow/:targetId/status')
  async getFollowStatus(
    @CurrentUser() user: CurrentUserData,
    @Param('targetId') targetId: string,
  ): Promise<FollowStatusDto> {
    return this.userService.getFollowStatus(user.userId, targetId);
  }

  @Post('follow/:targetId')
  async follow(
    @CurrentUser() user: CurrentUserData,
    @Param('targetId') targetId: string,
  ): Promise<{ success: boolean }> {
    return this.userService.follow(user.userId, targetId);
  }

  @Delete('follow/:targetId')
  async unfollow(
    @CurrentUser() user: CurrentUserData,
    @Param('targetId') targetId: string,
  ): Promise<{ success: boolean }> {
    return this.userService.unfollow(user.userId, targetId);
  }

  // ── Settings ───────────────────────────────────────────────────

  @Put('settings/dm-price')
  async setDmPrice(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { price: number | null },
  ): Promise<{ success: boolean; dmPrice: number | null }> {
    return this.userService.setDmPrice(user.userId, body.price);
  }

  // ── Discovery ──────────────────────────────────────────────────

  @Get('recommended')
  async getRecommended(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limitStr?: string,
  ): Promise<RecommendedCreatorDto[]> {
    const limit = Math.min(50, Math.max(1, parseInt(limitStr || '10', 10) || 10));
    return this.userService.getRecommendedCreators(user.userId, limit);
  }

  @UseGuards(OptionalJwtGuard)
  @Get('search')
  async searchUsers(
    @Query('q') query: string,
    @Query('limit') limitStr?: string,
  ): Promise<FollowerDto[]> {
    const limit = Math.min(50, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    return this.userService.searchUsers(query, limit);
  }

  // ── Followers / Following (parameterized routes must come after specific routes) ──

  @Public()
  @Get(':userId/followers')
  async getFollowers(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limitStr?: string,
  ): Promise<{ data: FollowerDto[]; total: number }> {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    return this.userService.getFollowers(userId, p, limit);
  }

  @Public()
  @Get(':userId/following')
  async getFollowing(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limitStr?: string,
  ): Promise<{ data: FollowerDto[]; total: number }> {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    return this.userService.getFollowing(userId, p, limit);
  }

  /** 取得指定用戶對外資料 */
  @Public()
  @Get('profile/:userId')
  async getProfile(
    @Param('userId') userId: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ): Promise<UserProfileDto> {
    this.logger.log(`getProfile request userId=${userId}`);

    // Check if blocked
    if (currentUser) {
      const blocked = await this.userService.isBlocked(userId, currentUser.userId);
      if (blocked) {
        throw new ForbiddenException('This user is not available');
      }
    }

    const profile = await this.userService.getProfile(userId);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  /** 更新當前用戶資料（從 JWT 取 userId） */
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() body: UpdateProfileDto
  ): Promise<UserProfileDto> {
    const uid = user.userId;
    this.logger.log(`updateProfile request userId=${uid}`);
    return this.userService.updateProfile(uid, body);
  }

  /** 更新用戶位置（專用端點，供前端定期 GPS 更新） */
  @Put('location')
  async updateLocation(
    @CurrentUser() user: CurrentUserData,
    @Body() body: LocationUpdateDto,
  ): Promise<{ success: boolean }> {
    const uid = user.userId;
    this.logger.log(`updateLocation request userId=${uid} lat=${body.latitude} lng=${body.longitude}`);
    return this.userService.updateLocation(uid, body);
  }

  /** 取得指定 userId 列表的卡片（供 matching-service 內部呼叫） */
  @Public()
  @Post('cards/by-ids')
  async getCardsByIds(@Body() body: { userIds: string[] }): Promise<UserCardDto[]> {
    return this.userService.getCardsByIds(body.userIds);
  }

  /** 創建用戶（註冊用；允許未登入，由 auth 或 gateway 呼叫） */
  @Public()
  @Post()
  async create(@Body() body: CreateUserDto): Promise<UserProfileDto> {
    this.logger.log(`create user request role=${body.role} displayName=${body.displayName}`);
    const user = await this.userService.create(body);
    this.logger.log(`create user result id=${user.id}`);
    return user;
  }

  // ── Block / Unblock ──────────────────────────────────────────────

  @Post('block/:targetId')
  async blockUser(
    @CurrentUser() user: CurrentUserData,
    @Param('targetId') targetId: string,
  ): Promise<{ success: boolean }> {
    return this.userService.blockUser(user.userId, targetId);
  }

  @Delete('block/:targetId')
  async unblockUser(
    @CurrentUser() user: CurrentUserData,
    @Param('targetId') targetId: string,
  ): Promise<{ success: boolean }> {
    return this.userService.unblockUser(user.userId, targetId);
  }

  @Get('blocked')
  async getBlockedUsers(@CurrentUser() user: CurrentUserData): Promise<string[]> {
    return this.userService.getBlockedUsers(user.userId);
  }

  // ── Report ──────────────────────────────────────────────────────

  @Post('report')
  async createReport(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { targetType: 'user' | 'post' | 'comment'; targetId: string; reason: string; description?: string },
  ): Promise<ReportRecord> {
    return this.reportService.createReport(
      user.userId,
      body.targetType,
      body.targetId,
      body.reason,
      body.description,
    );
  }

  // ── Admin: Report Management ────────────────────────────────────

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getPendingReports(): Promise<ReportRecord[]> {
    return this.reportService.getPendingReports();
  }

  @Put('admin/reports/:reportId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateReportStatus(
    @Param('reportId') reportId: string,
    @Body() body: { status: 'reviewed' | 'actioned' | 'dismissed' },
  ): Promise<ReportRecord> {
    return this.reportService.updateReportStatus(reportId, body.status);
  }
}
