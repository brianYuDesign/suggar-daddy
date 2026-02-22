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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaticPageService } from './static-page.service';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';
import { StaticPageQueryDto } from './dto/static-page-query.dto';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@suggar-daddy/auth';
import { UserRole } from '@suggar-daddy/common';

@ApiTags('Static Pages')
@Controller('pages')
export class StaticPageController {
  constructor(private readonly staticPageService: StaticPageService) {}

  @Get('public/:slug')
  @ApiOperation({ summary: '通過 slug 獲取已發布的頁面（公開）' })
  async findBySlug(@Param('slug') slug: string) {
    const page = await this.staticPageService.findBySlug(slug);
    if (!page) {
      return { found: false };
    }
    return { found: true, page };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理員獲取所有頁面' })
  async findAllAdmin(@Query() query: StaticPageQueryDto) {
    const result = await this.staticPageService.findAll(query);
    return {
      items: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得頁面統計' })
  async getStats() {
    return this.staticPageService.getStats();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '通過 ID 獲取頁面（管理員）' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.staticPageService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '創建頁面' })
  async create(
    @Body() dto: CreateStaticPageDto,
    @CurrentUser('userId') editorId: string,
  ) {
    return this.staticPageService.create(dto, editorId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新頁面' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaticPageDto,
    @CurrentUser('userId') editorId: string,
  ) {
    return this.staticPageService.update(id, dto, editorId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除頁面' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.staticPageService.remove(id);
    return { message: '頁面已刪除' };
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '發布頁面' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') editorId: string,
  ) {
    return this.staticPageService.publish(id, editorId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '歸檔頁面' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') editorId: string,
  ) {
    return this.staticPageService.archive(id, editorId);
  }
}
