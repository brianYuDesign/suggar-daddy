import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { SubscriptionTierService } from './subscription-tier.service';
import { CreateSubscriptionTierDto, UpdateSubscriptionTierDto } from './dto/subscription-tier.dto';

@Controller('subscription-tiers')
export class SubscriptionTierController {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  @Post()
  create(@Body() createDto: CreateSubscriptionTierDto) {
    return this.subscriptionTierService.create(createDto);
  }

  @Get()
  findAll(@Query('creatorId') creatorId?: string) {
    if (creatorId) {
      return this.subscriptionTierService.findByCreator(creatorId);
    }
    return this.subscriptionTierService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionTierService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateSubscriptionTierDto) {
    return this.subscriptionTierService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionTierService.remove(id);
  }
}
