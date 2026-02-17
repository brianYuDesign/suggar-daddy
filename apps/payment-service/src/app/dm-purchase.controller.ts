import {
  Body,
  Controller,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';
import { InjectLogger } from '@suggar-daddy/common';
import { DmPurchaseService } from './dm-purchase.service';

@ApiTags('DM Purchases')
@ApiBearerAuth('JWT-auth')
@Controller('dm-purchases')
export class DmPurchaseController {
  @InjectLogger() private readonly logger!: Logger;

  constructor(private readonly dmPurchaseService: DmPurchaseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Purchase DM access',
    description: 'Purchase the ability to send direct messages to a creator. One-time payment unlocks DM feature.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'DM access purchased successfully',
    schema: {
      example: {
        id: 'dm-123',
        buyerId: 'user-456',
        creatorId: 'creator-789',
        amount: 5.00,
        status: 'completed',
        purchasedAt: '2024-01-20T15:00:00Z',
        expiresAt: null
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Already purchased or creator not available',
    schema: {
      example: {
        statusCode: 400,
        message: 'DM access already purchased',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
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
