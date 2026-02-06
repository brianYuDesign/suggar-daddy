import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionTierService } from './subscription-tier.service';
import { CreateSubscriptionTierDto, UpdateSubscriptionTierDto } from './dto/subscription-tier.dto';
import {
  JwtAuthGuard,
  CurrentUser,
  Public,
  Roles,
  UserRole,
} from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';

@Controller('subscription-tiers')
export class SubscriptionTierController {
  constructor(private readonly subscriptionTierService: SubscriptionTierService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  create(@CurrentUser() user: CurrentUserData, @Body() createDto: CreateSubscriptionTierDto) {
    return this.subscriptionTierService.create({ ...createDto, creatorId: user.userId });
  }

  @Get()
  @Public()
  findAll(@Query('creatorId') creatorId?: string) {
    if (creatorId) {
      return this.subscriptionTierService.findByCreator(creatorId);
    }
    return this.subscriptionTierService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.subscriptionTierService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionTierDto
  ) {
    const tier = await this.subscriptionTierService.findOne(id);
    if (tier.creatorId !== user.userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the creator or admin can update this tier');
    }
    return this.subscriptionTierService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const tier = await this.subscriptionTierService.findOne(id);
    if (tier.creatorId !== user.userId && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the creator or admin can delete this tier');
    }
    return this.subscriptionTierService.remove(id);
  }
}
