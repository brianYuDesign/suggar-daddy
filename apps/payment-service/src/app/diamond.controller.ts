import { Controller, Get, Post, Put, Body, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { InjectLogger, PermissionRole } from '@suggar-daddy/common';
import { DiamondService } from './diamond.service';
import { SpendDiamondsDto, ConvertDiamondsDto, AdminAdjustBalanceDto, UpdateDiamondConfigDto } from './dto/diamond.dto';

@ApiTags('Diamonds')
@ApiBearerAuth('JWT-auth')
@Controller('diamonds')
export class DiamondController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly diamondService: DiamondService) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get diamond balance' })
  @ApiResponse({ status: 200, description: 'Diamond balance retrieved' })
  async getBalance(@CurrentUser() user: CurrentUserData) {
    return this.diamondService.getBalance(user.userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get diamond transaction history' })
  @ApiResponse({ status: 200, description: 'Diamond transaction history retrieved' })
  async getHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ) {
    const l = limit ? parseInt(limit, 10) || 50 : 50;
    return this.diamondService.getDiamondHistory(user.userId, l);
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get diamond pricing config' })
  @ApiResponse({ status: 200, description: 'Diamond config retrieved' })
  async getConfig() {
    return this.diamondService.getConfig();
  }

  @Post('convert')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert diamonds to cash (creator withdrawal)' })
  @ApiResponse({ status: 201, description: 'Diamonds converted to cash' })
  @ApiResponse({ status: 400, description: 'Insufficient diamonds or below minimum' })
  async convertToCash(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ConvertDiamondsDto,
  ) {
    this.logger.log(`Diamond conversion request userId=${user.userId} amount=${dto.amount}`);
    const result = await this.diamondService.convertDiamondsToCash(user.userId, dto.amount);
    this.logger.log(`Diamond conversion complete userId=${user.userId} cash=$${result.cashAmount}`);
    return result;
  }

  @Post('spend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spend diamonds (generic)' })
  @ApiResponse({ status: 201, description: 'Diamonds spent' })
  @ApiResponse({ status: 400, description: 'Insufficient diamonds' })
  async spend(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SpendDiamondsDto,
  ) {
    return this.diamondService.spendDiamonds(
      user.userId,
      dto.amount,
      dto.referenceType,
      dto.referenceId,
      dto.description,
    );
  }

  @Post('spend-super-like')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spend diamonds on super like (internal)' })
  @ApiResponse({ status: 201, description: 'Super like diamond cost deducted' })
  @ApiResponse({ status: 400, description: 'Insufficient diamonds' })
  async spendSuperLike(@CurrentUser() user: CurrentUserData) {
    return this.diamondService.spendOnSuperLike(user.userId);
  }

  @Post('spend-boost')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Spend diamonds on boost (internal)' })
  @ApiResponse({ status: 201, description: 'Boost diamond cost deducted' })
  @ApiResponse({ status: 400, description: 'Insufficient diamonds' })
  async spendBoost(@CurrentUser() user: CurrentUserData) {
    return this.diamondService.spendOnBoost(user.userId);
  }

  // ── Admin-only endpoints ──────────────────────────────────────

  @Post('admin-adjust')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PermissionRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: adjust user diamond balance' })
  @ApiResponse({ status: 201, description: 'Balance adjusted' })
  async adminAdjustBalance(@Body() dto: AdminAdjustBalanceDto) {
    this.logger.log(`Admin adjusting balance userId=${dto.userId} amount=${dto.amount} reason=${dto.reason}`);
    return this.diamondService.adminAdjustBalance(dto.userId, dto.amount, dto.reason);
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(PermissionRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: update diamond config' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async updateConfig(@Body() dto: UpdateDiamondConfigDto) {
    this.logger.log(`Admin updating diamond config: ${JSON.stringify(dto)}`);
    return this.diamondService.updateConfig(dto);
  }
}
