import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, CurrentUserData, Roles } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, UpdateTransactionDto, RefundTransactionDto } from './dto/transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create transaction',
    description: 'Create a new payment transaction (subscription, PPV, or tip)'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Transaction created successfully',
    schema: {
      example: {
        id: 'tx-123',
        userId: 'user-456',
        type: 'ppv',
        amount: 25.00,
        currency: 'USD',
        status: 'pending',
        stripePaymentId: 'pi_123abc',
        relatedEntityId: 'post-789',
        relatedEntityType: 'post',
        createdAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid transaction data',
    schema: {
      example: {
        statusCode: 400,
        message: ['amount must be between 0 and 999999'],
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: CurrentUserData, @Body() createDto: CreateTransactionDto) {
    return this.transactionService.create({ ...createDto, userId: user.userId });
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get transactions',
    description: 'Retrieve paginated list of transactions. Regular users can only see their own transactions. Admins can query any user.'
  })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID (admin only)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 100)', example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'Transactions retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'tx-123',
            userId: 'user-456',
            type: 'ppv',
            amount: 25.00,
            status: 'succeeded',
            createdAt: '2024-01-20T15:00:00Z'
          }
        ],
        total: 150,
        page: 1,
        limit: 20
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('userId') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const p = Number(page) || 1;
    const l = Math.min(Number(limit) || 20, 100);
    // Non-admin users can only query their own transactions
    const queryUserId = user.role === UserRole.ADMIN ? (userId ?? user.userId) : user.userId;
    return this.transactionService.findByUser(queryUserId, p, l);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get transaction by ID',
    description: 'Retrieve a specific transaction by ID. Regular users can only view their own transactions.'
  })
  @ApiParam({ name: 'id', description: 'Transaction ID', example: 'tx-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction retrieved successfully',
    schema: {
      example: {
        id: 'tx-123',
        userId: 'user-456',
        type: 'ppv',
        amount: 25.00,
        currency: 'USD',
        status: 'succeeded',
        stripePaymentId: 'pi_123abc',
        relatedEntityId: 'post-789',
        relatedEntityType: 'post',
        metadata: {},
        createdAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Can only view own transactions' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const tx = await this.transactionService.findOne(id);
    if (user.role !== UserRole.ADMIN && tx.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own transactions');
    }
    return tx;
  }

  @Post(':id/refund')
  @ApiOperation({ 
    summary: 'Refund transaction',
    description: 'Request a refund for a transaction. Can be full or partial refund. Only succeeded transactions can be refunded.'
  })
  @ApiParam({ name: 'id', description: 'Transaction ID', example: 'tx-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Refund processed successfully',
    schema: {
      example: {
        id: 'tx-123',
        status: 'refunded',
        metadata: {
          refundedAt: '2024-01-21T10:00:00Z',
          refundedAmount: 25.00,
          refundReason: 'Customer request',
          stripeRefundId: 're_123abc'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Transaction cannot be refunded',
    schema: {
      example: {
        statusCode: 400,
        message: 'Transaction has already been refunded',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async refund(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() refundDto: RefundTransactionDto,
  ) {
    const tx = await this.transactionService.findOne(id);
    if (user.role !== UserRole.ADMIN && tx.userId !== user.userId) {
      throw new ForbiddenException('You can only refund your own transactions');
    }
    return this.transactionService.refund(id, refundDto.reason, refundDto.amount);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: '[Admin] Update transaction',
    description: 'Update transaction status or metadata. Requires ADMIN role.'
  })
  @ApiParam({ name: 'id', description: 'Transaction ID', example: 'tx-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Transaction updated successfully',
    schema: {
      example: {
        id: 'tx-123',
        status: 'succeeded',
        metadata: { note: 'Manually approved' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  update(@Param('id') id: string, @Body() updateDto: UpdateTransactionDto) {
    return this.transactionService.update(id, updateDto);
  }
}
