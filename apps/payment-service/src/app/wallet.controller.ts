import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard, UserRole } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';
import { RequestWithdrawalDto, ProcessWithdrawalDto } from './dto/wallet.dto';

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
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.walletService.requestWithdrawal(
      user.userId,
      dto.amount,
      dto.payoutMethod,
      dto.payoutDetails,
    );
  }

  // ── Admin ────────────────────────────────────────────────────────

  @Get('admin/withdrawals/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getPendingWithdrawals() {
    return this.walletService.getPendingWithdrawals();
  }

  @Put('admin/withdrawals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  processWithdrawal(
    @Param('id') id: string,
    @Body() dto: ProcessWithdrawalDto,
  ) {
    return this.walletService.processWithdrawal(id, dto.action);
  }
}
