import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaticPage, PageStatus } from './entities/static-page.entity';
import { CreateStaticPageDto } from './dto/create-static-page.dto';
import { UpdateStaticPageDto } from './dto/update-static-page.dto';
import { StaticPageQueryDto } from './dto/static-page-query.dto';

@Injectable()
export class StaticPageService {
  constructor(
    @InjectRepository(StaticPage)
    private readonly pageRepository: Repository<StaticPage>,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '-')
      .replace(/[^\w\u4e00-\u9fff-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }

  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let count = 0;
    let existing = await this.pageRepository.findOne({ where: { slug } });
    while (existing && existing.id !== excludeId) {
      count++;
      slug = `${base}-${count}`;
      existing = await this.pageRepository.findOne({ where: { slug } });
    }
    return slug;
  }

  async create(dto: CreateStaticPageDto, editorId?: string): Promise<StaticPage> {
    const baseSlug = dto.slug || this.generateSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const page = this.pageRepository.create({
      ...dto,
      slug,
      lastEditedBy: editorId,
      publishedAt: dto.status === PageStatus.PUBLISHED ? new Date() : undefined,
    });

    return this.pageRepository.save(page);
  }

  async findAll(query: StaticPageQueryDto): Promise<{ data: StaticPage[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, pageType, status, search } = query;

    const qb = this.pageRepository.createQueryBuilder('page');

    if (pageType) qb.andWhere('page.pageType = :pageType', { pageType });
    if (status) qb.andWhere('page.status = :status', { status });
    if (search) {
      qb.andWhere('(page.title ILIKE :search OR page.slug ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const validSortColumns = ['title', 'pageType', 'status', 'publishedAt', 'createdAt', 'updatedAt'];
    const sortColumn = query.sortBy && validSortColumns.includes(query.sortBy) ? query.sortBy : 'updatedAt';
    const sortDirection = query.sortDir === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`page.${sortColumn}`, sortDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<StaticPage> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) throw new NotFoundException(`StaticPage ${id} not found`);
    return page;
  }

  async findBySlug(slug: string): Promise<StaticPage | null> {
    return this.pageRepository.findOne({
      where: { slug, status: PageStatus.PUBLISHED },
    });
  }

  async update(id: string, dto: UpdateStaticPageDto, editorId?: string): Promise<StaticPage> {
    const page = await this.findOne(id);

    if (dto.title && dto.title !== page.title && !dto.slug) {
      const baseSlug = this.generateSlug(dto.title);
      page.slug = await this.ensureUniqueSlug(baseSlug, id);
    } else if (dto.slug && dto.slug !== page.slug) {
      page.slug = await this.ensureUniqueSlug(dto.slug, id);
    }

    if (dto.status === PageStatus.PUBLISHED && page.status !== PageStatus.PUBLISHED) {
      page.publishedAt = new Date();
    }

    page.lastEditedBy = editorId || page.lastEditedBy;
    Object.assign(page, dto);
    return this.pageRepository.save(page);
  }

  async remove(id: string): Promise<void> {
    const page = await this.findOne(id);
    await this.pageRepository.remove(page);
  }

  async publish(id: string, editorId?: string): Promise<StaticPage> {
    return this.update(id, { status: PageStatus.PUBLISHED }, editorId);
  }

  async archive(id: string, editorId?: string): Promise<StaticPage> {
    return this.update(id, { status: PageStatus.ARCHIVED }, editorId);
  }

  async getStats(): Promise<{ total: number; published: number; draft: number; archived: number }> {
    const [total, published, draft, archived] = await Promise.all([
      this.pageRepository.count(),
      this.pageRepository.count({ where: { status: PageStatus.PUBLISHED } }),
      this.pageRepository.count({ where: { status: PageStatus.DRAFT } }),
      this.pageRepository.count({ where: { status: PageStatus.ARCHIVED } }),
    ]);
    return { total, published, draft, archived };
  }
}
