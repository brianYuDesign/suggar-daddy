/**
 * 用戶管理控制器
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
import { UserManagementService } from './user-management.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  /**
   * GET /api/v1/admin/users
   * 分頁查詢用戶列表
   */
  @Get()
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.userManagementService.listUsers(page, limit, role, status, search);
  }

  /**
   * GET /api/v1/admin/users/stats
   * 取得用戶統計資料
   */
  @Get('stats')
  getUserStats() {
    return this.userManagementService.getUserStats();
  }

  /**
   * GET /api/v1/admin/users/:userId
   * 取得單一用戶詳情
   */
  @Get(':userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.userManagementService.getUserDetail(userId);
  }

  /**
   * POST /api/v1/admin/users/:userId/disable
   * 停用用戶帳號
   */
  @Post(':userId/disable')
  disableUser(@Param('userId') userId: string) {
    return this.userManagementService.disableUser(userId);
  }

  /**
   * POST /api/v1/admin/users/:userId/enable
   * 啟用用戶帳號
   */
  @Post(':userId/enable')
  enableUser(@Param('userId') userId: string) {
    return this.userManagementService.enableUser(userId);
  }

  /** POST /api/v1/admin/users/:userId/role — 變更用戶角色 */
  @Post(':userId/role')
  changeUserRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.userManagementService.changeUserRole(userId, role);
  }

  /** GET /api/v1/admin/users/:userId/activity — 取得用戶活動摘要 */
  @Get(':userId/activity')
  getUserActivity(@Param('userId') userId: string) {
    return this.userManagementService.getUserActivity(userId);
  }
}
