import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@suggar-daddy/common';
import { DiscoveryService } from './discovery.service';

@Controller('posts')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('trending')
  @Public()
  getTrending(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.discoveryService.getTrendingPosts(Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }

  @Get('search')
  @Public()
  searchPosts(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.discoveryService.searchPosts(query, Number(page) || 1, Math.min(Number(limit) || 20, 100));
  }
}
