import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getWallet(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getWallet(user.userId);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  getEarningsSummary(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getEarningsSummary(user.userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getWalletHistory(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getWalletHistory(user.userId);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  getWithdrawals(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getWithdrawals(user.userId);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  requestWithdrawal(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { amount: number; payoutMethod: string; payoutDetails?: string },
  ) {
    return this.walletService.requestWithdrawal(
      user.userId,
      body.amount,
      body.payoutMethod,
      body.payoutDetails,
    );
  }

  // ── Admin ────────────────────────────────────────────────────────

  @Get('admin/withdrawals/pending')
  @UseGuards(JwtAuthGuard)
  getPendingWithdrawals() {
    // TODO: Add @Roles('ADMIN') guard
    return this.walletService.getPendingWithdrawals();
  }

  @Put('admin/withdrawals/:id')
  @UseGuards(JwtAuthGuard)
  processWithdrawal(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' },
  ) {
    // TODO: Add @Roles('ADMIN') guard
    return this.walletService.processWithdrawal(id, body.action);
  }
}
