import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Content, ContentTag } from '../../database/entities';
import { CreateContentDto, UpdateContentDto, ContentResponseDto } from '../../dtos/content.dto';

@Controller('api/v1/contents')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(ContentTag)
    private tagRepository: Repository<ContentTag>,
  ) {}

  /**
   * GET /api/v1/contents - 獲取所有內容
   */
  @Get()
  async getAllContents(@Query('limit') limit: string = '50'): Promise<ContentResponseDto[]> {
    const contents = await this.contentRepository.find({
      relations: ['tags'],
      order: { created_at: 'DESC' },
      take: parseInt(limit),
    });

    return contents.map((c) => this.mapToDto(c));
  }

  /**
   * GET /api/v1/contents/:id - 獲取單個內容
   */
  @Get(':id')
  async getContent(@Param('id') id: string): Promise<ContentResponseDto> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['tags'],
    });

    if (!content) {
      throw new Error(`Content ${id} not found`);
    }

    return this.mapToDto(content);
  }

  /**
   * POST /api/v1/contents - 創建內容
   */
  @Post()
  @HttpCode(201)
  async createContent(@Body() dto: CreateContentDto): Promise<ContentResponseDto> {
    const content = this.contentRepository.create({
      title: dto.title,
      description: dto.description,
      creator_id: dto.creator_id,
      view_count: 0,
      like_count: 0,
      share_count: 0,
      engagement_score: 0,
    });

    // 處理標籤
    if (dto.tags && dto.tags.length > 0) {
      const tags: ContentTag[] = [];
      for (const tagName of dto.tags) {
        let tag = await this.tagRepository.findOne({ where: { name: tagName } });
        if (!tag) {
          tag = await this.tagRepository.save(this.tagRepository.create({ name: tagName }));
        }
        tags.push(tag);
      }
      content.tags = tags;
    }

    const saved = await this.contentRepository.save(content);
    this.logger.log(`Created content: ${saved.id}`);

    return this.mapToDto(saved);
  }

  /**
   * PUT /api/v1/contents/:id - 更新內容
   */
  @Put(':id')
  async updateContent(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ): Promise<ContentResponseDto> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['tags'],
    });

    if (!content) {
      throw new Error(`Content ${id} not found`);
    }

    if (dto.title) content.title = dto.title;
    if (dto.description !== undefined) content.description = dto.description;
    if (dto.is_featured !== undefined) content.is_featured = dto.is_featured;

    const updated = await this.contentRepository.save(content);
    return this.mapToDto(updated);
  }

  /**
   * POST /api/v1/contents/:id/view - 記錄觀看
   */
  @Post(':id/view')
  @HttpCode(204)
  async recordView(@Param('id') id: string): Promise<void> {
    const content = await this.contentRepository.findOne({ where: { id } });
    if (content) {
      content.view_count += 1;
      await this.contentRepository.save(content);
    }
  }

  /**
   * POST /api/v1/contents/:id/like - 記錄點讚
   */
  @Post(':id/like')
  @HttpCode(204)
  async recordLike(@Param('id') id: string): Promise<void> {
    const content = await this.contentRepository.findOne({ where: { id } });
    if (content) {
      content.like_count += 1;
      await this.contentRepository.save(content);
    }
  }

  /**
   * DELETE /api/v1/contents/:id - 刪除內容
   */
  @Delete(':id')
  @HttpCode(204)
  async deleteContent(@Param('id') id: string): Promise<void> {
    await this.contentRepository.delete(id);
    this.logger.log(`Deleted content: ${id}`);
  }

  private mapToDto(content: Content): ContentResponseDto {
    return {
      id: content.id,
      title: content.title,
      description: content.description,
      creator_id: content.creator_id,
      view_count: content.view_count,
      like_count: content.like_count,
      share_count: content.share_count,
      engagement_score: content.engagement_score,
      tags: content.tags?.map((t: ContentTag) => t.name) || [],
      created_at: content.created_at,
      updated_at: content.updated_at,
    };
  }
}
