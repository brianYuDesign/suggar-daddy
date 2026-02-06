import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PostPurchaseService } from './post-purchase.service';
import { CreatePostPurchaseDto } from './dto/post-purchase.dto';

@Controller('post-purchases')
export class PostPurchaseController {
  constructor(private readonly postPurchaseService: PostPurchaseService) {}

  @Post()
  create(@Body() dto: CreatePostPurchaseDto) {
    return this.postPurchaseService.create(dto);
  }

  @Get()
  findByBuyer(@Query('buyerId') buyerId: string) {
    return this.postPurchaseService.findByBuyer(buyerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postPurchaseService.findOne(id);
  }
}
