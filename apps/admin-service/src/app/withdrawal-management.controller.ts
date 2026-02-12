/**
 * 提款管理控制器
 * 所有端點僅限 ADMIN 角色存取
 */

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
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@suggar-daddy/common';
import { WithdrawalManagementService } from './withdrawal-management.service';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class WithdrawalManagementController {
  constructor(
    private readonly withdrawalService: WithdrawalManagementService,
  ) {}

  /**
   * GET /api/v1/admin/withdrawals
   * 分頁查詢提款列表，支援狀態篩選
   */
  @Get()
  listWithdrawals(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.withdrawalService.listWithdrawals(page, limit, status);
  }

  /**
   * GET /api/v1/admin/withdrawals/stats
   * 提款統計概覽
   */
  @Get('stats')
  getWithdrawalStats() {
    return this.withdrawalService.getWithdrawalStats();
  }

  /**
   * GET /api/v1/admin/withdrawals/:withdrawalId
   * 取得單筆提款詳情（含用戶資訊）
   */
  @Get(':withdrawalId')
  getWithdrawalDetail(@Param('withdrawalId') withdrawalId: string) {
    return this.withdrawalService.getWithdrawalDetail(withdrawalId);
  }

  /**
   * POST /api/v1/admin/withdrawals/:withdrawalId/approve
   * 批准提款申請
   */
  @Post(':withdrawalId/approve')
  approveWithdrawal(@Param('withdrawalId') withdrawalId: string) {
    return this.withdrawalService.processWithdrawal(withdrawalId, 'approve');
  }

  /**
   * POST /api/v1/admin/withdrawals/:withdrawalId/reject
   * 拒絕提款申請（需填理由）
   */
  @Post(':withdrawalId/reject')
  rejectWithdrawal(
    @Param('withdrawalId') withdrawalId: string,
    @Body('reason') reason?: string,
  ) {
    return this.withdrawalService.processWithdrawal(
      withdrawalId,
      'reject',
      reason,
    );
  }
}
