import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PostPurchaseService } from './post-purchase.service';
import { CreatePostPurchaseDto } from './dto/post-purchase.dto';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';

@Controller('post-purchases')
export class PostPurchaseController {
  constructor(private readonly postPurchaseService: PostPurchaseService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreatePostPurchaseDto) {
    return this.postPurchaseService.create({ ...dto, buyerId: user.userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findByBuyer(@CurrentUser() user: CurrentUserData, @Query('buyerId') buyerId?: string) {
    const uid = user.userId;
    if (buyerId && buyerId !== uid) return []; // 僅允許查自己的購買紀錄
    return this.postPurchaseService.findByBuyer(uid);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.postPurchaseService.findOne(id);
  }
}
