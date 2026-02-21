import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { DiamondManagementService } from './diamond-management.service';

@Controller('diamonds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DiamondManagementController {
  constructor(private readonly diamondService: DiamondManagementService) {}

  @Get('stats')
  getStats() {
    return this.diamondService.getStats();
  }

  @Get('balances')
  listBalances(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.diamondService.listBalances(page, limit, search);
  }

  @Get('balances/:userId')
  getBalance(@Param('userId') userId: string) {
    return this.diamondService.getBalance(userId);
  }

  @Post('balances/:userId/adjust')
  adjustBalance(
    @Param('userId') userId: string,
    @Body() body: { amount: number; reason: string },
    @Headers('authorization') auth: string,
  ) {
    return this.diamondService.adjustBalance(userId, body.amount, body.reason, auth.replace('Bearer ', ''));
  }

  @Get('transactions')
  listTransactions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ) {
    return this.diamondService.listTransactions(page, limit, type, userId);
  }

  @Get('purchases')
  listPurchases(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
  ) {
    return this.diamondService.listPurchases(page, limit, status, userId);
  }

  @Get('packages')
  getPackages(@Headers('authorization') auth: string) {
    return this.diamondService.getPackages(auth.replace('Bearer ', ''));
  }

  @Post('packages')
  createPackage(@Body() dto: Record<string, unknown>, @Headers('authorization') auth: string) {
    return this.diamondService.createPackage(dto, auth.replace('Bearer ', ''));
  }

  @Put('packages/:id')
  updatePackage(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
    @Headers('authorization') auth: string,
  ) {
    return this.diamondService.updatePackage(id, dto, auth.replace('Bearer ', ''));
  }

  @Delete('packages/:id')
  deletePackage(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.diamondService.deletePackage(id, auth.replace('Bearer ', ''));
  }

  @Get('config')
  getConfig(@Headers('authorization') auth: string) {
    return this.diamondService.getConfig(auth.replace('Bearer ', ''));
  }

  @Put('config')
  updateConfig(@Body() dto: Record<string, unknown>, @Headers('authorization') auth: string) {
    return this.diamondService.updateConfig(dto, auth.replace('Bearer ', ''));
  }
}
