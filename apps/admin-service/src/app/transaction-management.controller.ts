/**
 * 交易管理控制器
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
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { TransactionManagementService } from './transaction-management.service';

export class AdminRefundDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  amount?: number;
}

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

  /** POST /api/admin/transactions/:id/refund — 退款交易 */
  @Post(':id/refund')
  refundTransaction(
    @Param('id') id: string,
    @Body() refundDto: AdminRefundDto,
  ) {
    return this.transactionService.refundTransaction(id, refundDto.reason, refundDto.amount);
  }

  /** GET /api/admin/transactions/type-stats — 交易類型分佈 */
  @Get('type-stats')
  getTransactionTypeStats() {
    return this.transactionService.getTransactionTypeStats();
  }
}
