import {
  Body,
  Controller,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { InjectLogger } from '@suggar-daddy/common';
import { DmPurchaseService } from './dm-purchase.service';

@Controller('dm-purchases')
export class DmPurchaseController {
  @InjectLogger() private readonly logger!: Logger;

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
