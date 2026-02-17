import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard, CurrentUser, Roles, RolesGuard, type CurrentUserData } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { RequestWithdrawalDto, ProcessWithdrawalDto } from './dto/wallet.dto';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get user wallet',
    description: 'Retrieve the current user\'s wallet information including balance and currency'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet retrieved successfully',
    schema: {
      example: {
        userId: 'user-123',
        balance: 1250.50,
        currency: 'USD',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:45:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getWallet(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getWallet(user.userId);
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get earnings summary',
    description: 'Retrieve detailed earnings breakdown including tips, subscriptions, and PPV sales'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Earnings summary retrieved successfully',
    schema: {
      example: {
        totalEarnings: 5432.10,
        tipsEarnings: 1200.00,
        subscriptionEarnings: 3000.00,
        ppvEarnings: 1232.10,
        currency: 'USD',
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getEarningsSummary(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getEarningsSummary(user.userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get wallet transaction history',
    description: 'Retrieve paginated list of all wallet transactions (deposits, withdrawals, earnings)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction history retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'wh-123',
            type: 'tip',
            amount: 50.00,
            balance: 1250.50,
            description: 'Tip from user-456',
            createdAt: '2024-01-20T14:45:00Z'
          }
        ],
        total: 150,
        page: 1,
        limit: 20
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWalletHistory(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getWalletHistory(user.userId);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get withdrawal requests',
    description: 'Retrieve all withdrawal requests made by the current user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal requests retrieved successfully',
    schema: {
      example: [
        {
          id: 'wd-789',
          userId: 'user-123',
          amount: 500.00,
          payoutMethod: 'bank_transfer',
          status: 'pending',
          requestedAt: '2024-01-18T10:00:00Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getWithdrawals(@CurrentUser() user: CurrentUserData) {
    return this.walletService.getWithdrawals(user.userId);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Request withdrawal',
    description: 'Create a new withdrawal request. Minimum $20, Maximum $50,000. Requires sufficient balance.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Withdrawal request created successfully',
    schema: {
      example: {
        id: 'wd-789',
        userId: 'user-123',
        amount: 500.00,
        payoutMethod: 'bank_transfer',
        payoutDetails: 'Bank Account: ***1234',
        status: 'pending',
        requestedAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid amount or insufficient balance',
    schema: {
      example: {
        statusCode: 400,
        message: 'Insufficient balance',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ 
    summary: '[Admin] Get pending withdrawals',
    description: 'Retrieve all pending withdrawal requests across all users. Requires ADMIN role.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Pending withdrawals retrieved successfully',
    schema: {
      example: [
        {
          id: 'wd-789',
          userId: 'user-123',
          amount: 500.00,
          payoutMethod: 'bank_transfer',
          status: 'pending',
          requestedAt: '2024-01-18T10:00:00Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  getPendingWithdrawals() {
    return this.walletService.getPendingWithdrawals();
  }

  @Put('admin/withdrawals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: '[Admin] Process withdrawal',
    description: 'Approve or reject a withdrawal request. Requires ADMIN role.'
  })
  @ApiParam({ name: 'id', description: 'Withdrawal ID', example: 'wd-789' })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal processed successfully',
    schema: {
      example: {
        id: 'wd-789',
        userId: 'user-123',
        amount: 500.00,
        status: 'approved',
        processedAt: '2024-01-20T16:00:00Z',
        processedBy: 'admin-456'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  processWithdrawal(
    @Param('id') id: string,
    @Body() dto: ProcessWithdrawalDto,
  ) {
    return this.walletService.processWithdrawal(id, dto.action);
  }
}
