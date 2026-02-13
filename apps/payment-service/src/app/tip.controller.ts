import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TipService } from './tip.service';
import { CreateTipDto } from './dto/tip.dto';
import { JwtAuthGuard, CurrentUser, type CurrentUserData } from '@suggar-daddy/common';

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
  findOne(@Param('id') id: string) {
    return this.tipService.findOne(id);
  }
}
