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
import { CreateUserDto, UpdateProfileDto, LocationUpdateDto } from '@suggar-daddy/dto';
import { CurrentUser, Public, Roles, RolesGuard, UserRole, JwtAuthGuard } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { UserService } from './user.service';

@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /** 取得當前用戶完整資料（從 JWT 取 userId） */
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserData) {
    const uid = user.userId;
    this.logger.log(`getMe request userId=${uid}`);
    const profile = await this.userService.getMe(uid);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  /** 取得推薦用卡片（exclude 逗號分隔的 userId，供 matching-service 使用） */
  @Public()
  @Get('cards')
  async getCards(
    @Query('exclude') excludeStr?: string,
    @Query('limit') limitStr?: string
  ) {
    const exclude = excludeStr ? excludeStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
    return this.userService.getCardsForRecommendation(exclude, limit);
  }

  /** 取得指定用戶對外資料 */
  @Get('profile/:userId')
  async getProfile(
    @Param('userId') userId: string,
    @CurrentUser() currentUser?: CurrentUserData,
  ) {
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
  ) {
    const uid = user.userId;
    this.logger.log(`updateProfile request userId=${uid}`);
    return this.userService.updateProfile(uid, body);
  }

  /** 更新用戶位置（專用端點，供前端定期 GPS 更新） */
  @Put('location')
  async updateLocation(
    @CurrentUser() user: CurrentUserData,
    @Body() body: LocationUpdateDto,
  ) {
    const uid = user.userId;
    this.logger.log(`updateLocation request userId=${uid} lat=${body.latitude} lng=${body.longitude}`);
    return this.userService.updateLocation(uid, body);
  }

  /** 取得指定 userId 列表的卡片（供 matching-service 內部呼叫） */
  @Public()
  @Post('cards/by-ids')
  async getCardsByIds(@Body() body: { userIds: string[] }) {
    return this.userService.getCardsByIds(body.userIds);
  }

  /** 創建用戶（註冊用；允許未登入，由 auth 或 gateway 呼叫） */
  @Public()
  @Post()
  async create(@Body() body: CreateUserDto) {
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
  ) {
    return this.userService.blockUser(user.userId, targetId);
  }

  @Delete('block/:targetId')
  async unblockUser(
    @CurrentUser() user: CurrentUserData,
    @Param('targetId') targetId: string,
  ) {
    return this.userService.unblockUser(user.userId, targetId);
  }

  @Get('blocked')
  async getBlockedUsers(@CurrentUser() user: CurrentUserData) {
    return this.userService.getBlockedUsers(user.userId);
  }

  // ── Report ──────────────────────────────────────────────────────

  @Post('report')
  async createReport(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { targetType: 'user' | 'post' | 'comment'; targetId: string; reason: string; description?: string },
  ) {
    return this.userService.createReport(
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
  async getPendingReports() {
    return this.userService.getPendingReports();
  }

  @Put('admin/reports/:reportId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateReportStatus(
    @Param('reportId') reportId: string,
    @Body() body: { status: 'reviewed' | 'actioned' | 'dismissed' },
  ) {
    return this.userService.updateReportStatus(reportId, body.status);
  }
}
