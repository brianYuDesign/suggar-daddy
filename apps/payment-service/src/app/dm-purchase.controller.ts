import {
  Body,
  Controller,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { DmPurchaseService } from './dm-purchase.service';

@Controller('dm-purchases')
export class DmPurchaseController {
  private readonly logger = new Logger(DmPurchaseController.name);

  constructor(private readonly dmPurchaseService: DmPurchaseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async purchase(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { creatorId: string },
  ) {
    this.logger.log(
      `DM purchase request: buyer=${user.userId} creator=${body.creatorId}`,
    );
    return this.dmPurchaseService.purchaseDmAccess(
      user.userId,
      body.creatorId,
    );
  }
}
