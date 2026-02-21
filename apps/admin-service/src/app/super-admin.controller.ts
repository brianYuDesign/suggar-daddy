/**
 * 超級管理員控制器
 * 僅限 SUPER_ADMIN 角色存取
 * 提供管理員帳號管理、權限概覽等功能
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { PermissionRole } from '@suggar-daddy/common';
import { SuperAdminService } from './super-admin.service';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PermissionRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * GET /api/admin/super-admin/admins
   * 列出所有管理員帳號
   */
  @Get('admins')
  listAdmins() {
    return this.superAdminService.listAdmins();
  }

  /**
   * GET /api/admin/super-admin/permissions
   * 取得系統權限概覽
   */
  @Get('permissions')
  getPermissionOverview() {
    return this.superAdminService.getPermissionOverview();
  }

  /**
   * POST /api/admin/super-admin/promote/:userId
   * 提升用戶為管理員
   */
  @Post('promote/:userId')
  @HttpCode(200)
  promoteToAdmin(
    @Param('userId') userId: string,
    @Body('role') role: PermissionRole,
  ) {
    return this.superAdminService.promoteToAdmin(userId, role);
  }

  /**
   * POST /api/admin/super-admin/demote/:userId
   * 移除管理員權限
   */
  @Post('demote/:userId')
  @HttpCode(200)
  demoteAdmin(@Param('userId') userId: string) {
    return this.superAdminService.demoteAdmin(userId);
  }

  /**
   * POST /api/admin/super-admin/force-password-reset/:userId
   * 強制用戶重設密碼
   */
  @Post('force-password-reset/:userId')
  @HttpCode(200)
  forcePasswordReset(@Param('userId') userId: string) {
    return this.superAdminService.forcePasswordReset(userId);
  }
}
