import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, ModerationStatus } from '@/entities/content.entity';

// DTOs
export class CreateContentDto {
  title: string;
  description?: string;
  media_url?: string;
  thumbnail_url?: string;
}

export class UpdateContentDto {
  title?: string;
  description?: string;
  media_url?: string;
  thumbnail_url?: string;
}

export class ContentResponseDto {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  media_url?: string;
  thumbnail_url?: string;
  moderation_status: ModerationStatus;
  moderation_reason?: string;
  moderated_by?: string;
  moderated_at?: Date;
  report_count: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ContentListResponse {
  data: ContentResponseDto[];
  total: number;
  limit: number;
  offset: number;
}

@Controller('api/contents')
export class ContentController {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
  ) {}

  /**
   * Create new content
   * Content starts with moderation_status = 'pending'
   */
  @Post()
  async createContent(
    @Body() dto: CreateContentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<ContentResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';

    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Title is required');
    }

    const content = this.contentRepository.create({
      creator_id: creatorId,
      title: dto.title,
      description: dto.description,
      media_url: dto.media_url,
      thumbnail_url: dto.thumbnail_url,
      moderation_status: ModerationStatus.PENDING, // Default to pending
      report_count: 0,
      is_published: false,
    });

    const saved = await this.contentRepository.save(content);
    return this.toResponseDto(saved);
  }

  /**
   * Get content by ID
   */
  @Get(':id')
  async getContent(
    @Param('id') contentId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<ContentResponseDto> {
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    return this.toResponseDto(content);
  }

  /**
   * List content with optional status filter
   * GET /api/contents?status=pending&limit=20&offset=0
   */
  @Get()
  async listContent(
    @Query('status') status?: ModerationStatus,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number = 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req?: any,
  ): Promise<ContentListResponse> {
    const creatorId = req?.user?.id;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    if (status) {
      where.moderation_status = status;
    }
    
    if (creatorId) {
      where.creator_id = creatorId;
    }

    const [data, total] = await this.contentRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: data.map((c) => this.toResponseDto(c)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update content
   * Note: Updates may reset moderation status to pending
   */
  @Put(':id')
  async updateContent(
    @Param('id') contentId: string,
    @Body() dto: UpdateContentDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<ContentResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to update this content');
    }

    // Update fields
    if (dto.title !== undefined) content.title = dto.title;
    if (dto.description !== undefined) content.description = dto.description;
    if (dto.media_url !== undefined) content.media_url = dto.media_url;
    if (dto.thumbnail_url !== undefined) content.thumbnail_url = dto.thumbnail_url;

    // If content was rejected, reset to pending for re-review
    if (content.moderation_status === ModerationStatus.REJECTED) {
      content.moderation_status = ModerationStatus.PENDING;
      content.moderation_reason = null;
    }

    const saved = await this.contentRepository.save(content);
    return this.toResponseDto(saved);
  }

  /**
   * Delete content
   */
  @Delete(':id')
  async deleteContent(
    @Param('id') contentId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<{ message: string }> {
    const creatorId = req.user?.id || 'test-creator-1';

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to delete this content');
    }

    await this.contentRepository.remove(content);
    return { message: 'Content deleted successfully' };
  }

  /**
   * Publish content
   * Only approved content can be published
   */
  @Post(':id/publish')
  async publishContent(
    @Param('id') contentId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<ContentResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to publish this content');
    }

    if (content.moderation_status !== ModerationStatus.APPROVED) {
      throw new BadRequestException(
        `Content cannot be published. Current status: ${content.moderation_status}`,
      );
    }

    content.is_published = true;
    const saved = await this.contentRepository.save(content);
    return this.toResponseDto(saved);
  }

  /**
   * Unpublish content
   */
  @Post(':id/unpublish')
  async unpublishContent(
    @Param('id') contentId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Req() req: any,
  ): Promise<ContentResponseDto> {
    const creatorId = req.user?.id || 'test-creator-1';

    const content = await this.contentRepository.findOne({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException(`Content ${contentId} not found`);
    }

    if (content.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to unpublish this content');
    }

    content.is_published = false;
    const saved = await this.contentRepository.save(content);
    return this.toResponseDto(saved);
  }

  private toResponseDto(content: Content): ContentResponseDto {
    return {
      id: content.id,
      creator_id: content.creator_id,
      title: content.title,
      description: content.description,
      media_url: content.media_url,
      thumbnail_url: content.thumbnail_url,
      moderation_status: content.moderation_status,
      moderation_reason: content.moderation_reason,
      moderated_by: content.moderated_by,
      moderated_at: content.moderated_at,
      report_count: content.report_count,
      is_published: content.is_published,
      created_at: content.created_at,
      updated_at: content.updated_at,
    };
  }
}
