import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PostPurchaseService } from './post-purchase.service';
import { CreatePostPurchaseDto } from './dto/post-purchase.dto';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/auth';

@ApiTags('Post Purchases (PPV)')
@ApiBearerAuth('JWT-auth')
@Controller('post-purchases')
export class PostPurchaseController {
  constructor(private readonly postPurchaseService: PostPurchaseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Purchase a post (PPV)',
    description: 'Purchase access to a pay-per-view post. Creates a payment transaction and unlocks the content.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Post purchased successfully',
    schema: {
      example: {
        id: 'pp-123',
        postId: 'post-789',
        buyerId: 'user-456',
        amount: 15.00,
        stripePaymentId: 'pi_123abc',
        status: 'completed',
        purchasedAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Already purchased or insufficient funds',
    schema: {
      example: {
        statusCode: 400,
        message: 'Post already purchased',
        error: 'Bad Request'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreatePostPurchaseDto) {
    return this.postPurchaseService.create({ ...dto, buyerId: user.userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get purchased posts',
    description: 'Retrieve list of posts purchased by the current user'
  })
  @ApiQuery({ name: 'buyerId', required: false, description: 'Filter by buyer ID (can only query own purchases)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Purchased posts retrieved successfully',
    schema: {
      example: [
        {
          id: 'pp-123',
          postId: 'post-789',
          buyerId: 'user-456',
          amount: 15.00,
          purchasedAt: '2024-01-20T15:00:00Z'
        }
      ]
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findByBuyer(@CurrentUser() user: CurrentUserData, @Query('buyerId') buyerId?: string) {
    const uid = user.userId;
    if (buyerId && buyerId !== uid) return []; // 僅允許查自己的購買紀錄
    return this.postPurchaseService.findByBuyer(uid);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Get post purchase by ID',
    description: 'Retrieve a specific post purchase record'
  })
  @ApiParam({ name: 'id', description: 'Post purchase ID', example: 'pp-123' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post purchase retrieved successfully',
    schema: {
      example: {
        id: 'pp-123',
        postId: 'post-789',
        buyerId: 'user-456',
        amount: 15.00,
        stripePaymentId: 'pi_123abc',
        status: 'completed',
        purchasedAt: '2024-01-20T15:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Post purchase not found' })
  findOne(@Param('id') id: string) {
    return this.postPurchaseService.findOne(id);
  }
}
