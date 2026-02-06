import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { TipService } from './tip.service';
import { CreateTipDto } from './dto/tip.dto';

@Controller('tips')
export class TipController {
  constructor(private readonly tipService: TipService) {}

  @Post()
  create(@Body() dto: CreateTipDto) {
    return this.tipService.create(dto);
  }

  @Get()
  findByUser(@Query('from') from?: string, @Query('to') to?: string) {
    if (from) return this.tipService.findByFrom(from);
    if (to) return this.tipService.findByTo(to);
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tipService.findOne(id);
  }
}
