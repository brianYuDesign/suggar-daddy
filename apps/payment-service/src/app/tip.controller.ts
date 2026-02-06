import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TipService } from './tip.service';
import { CreateTipDto } from './dto/tip.dto';
import { JwtAuthGuard, CurrentUser } from '@suggar-daddy/common';
import type { CurrentUserData } from '@suggar-daddy/common';

@Controller('tips')
export class TipController {
  constructor(private readonly tipService: TipService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: CurrentUserData, @Body() dto: CreateTipDto) {
    return this.tipService.create({ ...dto, fromUserId: user.userId });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findByUser(@CurrentUser() user: CurrentUserData, @Query('from') from?: string, @Query('to') to?: string) {
    const uid = user.userId;
    if (from && from !== uid) return []; // 僅允許查自己為 from 的紀錄
    if (to && to !== uid) return []; // 僅允許查自己為 to 的紀錄
    if (from) return this.tipService.findByFrom(from);
    if (to) return this.tipService.findByTo(to);
    return [];
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.tipService.findOne(id);
  }
}
