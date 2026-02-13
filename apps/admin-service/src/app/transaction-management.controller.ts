/**
 * 交易管理控制器
 * 所有端點僅限 ADMIN 角色存取
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, UserRole } from '@suggar-daddy/common';
import { TransactionManagementService } from './transaction-management.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class TransactionManagementController {
  constructor(
    private readonly transactionService: TransactionManagementService,
  ) {}

  /** GET /api/admin/transactions — 分頁查詢交易列表 */
  @Get()
  listTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.transactionService.listTransactions(page, limit, type, status);
  }

  /** GET /api/admin/transactions/type-stats — 交易類型分佈 */
  @Get('type-stats')
  getTransactionTypeStats() {
    return this.transactionService.getTransactionTypeStats();
  }
}
