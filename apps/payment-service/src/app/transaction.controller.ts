import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, CurrentUserData, Roles, UserRole } from '@suggar-daddy/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserData, @Body() createDto: CreateTransactionDto) {
    return this.transactionService.create({ ...createDto, userId: user.userId });
  }

  @Get()
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
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const tx = await this.transactionService.findOne(id);
    if (user.role !== UserRole.ADMIN && tx.userId !== user.userId) {
      throw new ForbiddenException('You can only view your own transactions');
    }
    return tx;
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateTransactionDto) {
    return this.transactionService.update(id, updateDto);
  }
}
