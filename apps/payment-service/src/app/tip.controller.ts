import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TipService } from './tip.service';
import { CreateTipDto } from './dto/tip.dto';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';

@ApiTags('Tips')
@ApiBearerAuth('JWT-auth')
@Controller('tips')
export class TipController {
  constructor(private readonly tipService: TipService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Send a diamond tip',
    description: 'Send diamonds as a tip to a creator with an optional message'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Tip sent successfully',
    schema: {
      example: {
        id: 'tip-123',
        fromUserId: 'user-456',
        toUserId: 'creator-789',
        amount: 100,
        message: 'Great content!',
        createdAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid tip data or insufficient diamonds',
    schema: {
      example: {
        statusCode: 400,
        message: 'Insufficient diamonds',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateTipDto) {
    return this.tipService.create({ ...dto, fromUserId: user.userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get tips',
    description: 'Retrieve tips sent by or received by the current user. Use query parameters to filter.'
  })
  @ApiQuery({ name: 'from', required: false, description: 'Filter tips sent by user ID' })
  @ApiQuery({ name: 'to', required: false, description: 'Filter tips received by user ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (max 100)', example: 20 })
  @ApiResponse({ 
    status: 200, 
    description: 'Tips retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'tip-123',
            fromUserId: 'user-456',
            toUserId: 'creator-789',
            amount: 10.00,
            message: 'Great content!',
            createdAt: '2024-01-20T15:00:00Z'
          }
        ],
        total: 45,
        page: 1,
        limit: 20
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByUser(
    @CurrentUser() user: CurrentUserData,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const uid = user.userId;
    const p = Number(page) || 1;
    const l = Math.min(Number(limit) || 20, 100);
    if (from && from !== uid) return { data: [], total: 0, page: p, limit: l };
    if (to && to !== uid) return { data: [], total: 0, page: p, limit: l };
    if (from) return this.tipService.findByFrom(from, p, l);
    if (to) return this.tipService.findByTo(to, p, l);
    return { data: [], total: 0, page: p, limit: l };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get tip by ID',
    description: 'Retrieve a specific tip by ID'
  })
  @ApiParam({ name: 'id', description: 'Tip ID', example: 'tip-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tip retrieved successfully',
    schema: {
      example: {
        id: 'tip-123',
        fromUserId: 'user-456',
        toUserId: 'creator-789',
        amount: 10.00,
        message: 'Great content!',
        stripePaymentId: 'pi_123abc',
        status: 'completed',
        createdAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tip not found' })
  findOne(@Param('id') id: string) {
    return this.tipService.findOne(id);
  }
}
