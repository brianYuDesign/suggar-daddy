// apps/content-service/src/app/blog/blog.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Blog, BlogStatus } from './entities/blog.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogQueryDto } from './dto/blog-query.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
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

  private async ensureUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let count = 0;
    while (await this.blogRepository.findOne({ where: { slug } })) {
      count++;
      slug = `${base}-${count}`;
    }
    return slug;
  }

  async create(dto: CreateBlogDto, authorId?: string, authorName?: string): Promise<Blog> {
    const baseSlug = this.generateSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const blog = this.blogRepository.create({
      ...dto,
      slug,
      authorId,
      authorName,
      publishedAt: dto.status === BlogStatus.PUBLISHED ? new Date() : undefined,
    });

    return this.blogRepository.save(blog);
  }

  async findAll(query: BlogQueryDto): Promise<{ data: Blog[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, category, status, search, tag } = query;

    const qb = this.blogRepository.createQueryBuilder('blog');

    if (category) qb.andWhere('blog.category = :category', { category });
    if (status) qb.andWhere('blog.status = :status', { status });
    if (search) {
      qb.andWhere('(blog.title ILIKE :search OR blog.excerpt ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (tag) {
      qb.andWhere(':tag = ANY(string_to_array(blog.tags, \',\'))', { tag });
    }

    const validSortColumns = ['title', 'category', 'status', 'viewCount', 'publishedAt', 'createdAt'];
    const sortColumn = query.sortBy && validSortColumns.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDir === 'asc' ? 'ASC' : 'DESC';
    qb.orderBy(`blog.${sortColumn}`, sortDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async findPublished(query: BlogQueryDto): Promise<{ data: Blog[]; total: number; page: number; limit: number }> {
    return this.findAll({ ...query, status: BlogStatus.PUBLISHED });
  }

  async findOne(id: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({ where: { id } });
    if (!blog) throw new NotFoundException(`Blog ${id} not found`);
    return blog;
  }

  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({ where: { slug } });
    if (!blog) throw new NotFoundException(`Blog with slug "${slug}" not found`);

    await this.blogRepository.increment({ id: blog.id }, 'viewCount', 1);
    blog.viewCount += 1;

    return blog;
  }

  async update(id: string, dto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.findOne(id);

    if (dto.title && dto.title !== blog.title) {
      const baseSlug = this.generateSlug(dto.title);
      const existing = await this.blogRepository.findOne({ where: { slug: baseSlug } });
      if (existing && existing.id !== id) {
        blog.slug = await this.ensureUniqueSlug(baseSlug);
      } else {
        blog.slug = baseSlug;
      }
    }

    if (dto.status === BlogStatus.PUBLISHED && blog.status !== BlogStatus.PUBLISHED) {
      blog.publishedAt = new Date();
    }

    Object.assign(blog, dto);
    return this.blogRepository.save(blog);
  }

  async remove(id: string): Promise<void> {
    const blog = await this.findOne(id);
    await this.blogRepository.remove(blog);
  }

  async publish(id: string): Promise<Blog> {
    return this.update(id, { status: BlogStatus.PUBLISHED });
  }

  async archive(id: string): Promise<Blog> {
    return this.update(id, { status: BlogStatus.ARCHIVED });
  }

  async getStats(): Promise<{ total: number; published: number; draft: number; archived: number; totalViews: number }> {
    const [total, published, draft, archived, viewsResult] = await Promise.all([
      this.blogRepository.count(),
      this.blogRepository.count({ where: { status: BlogStatus.PUBLISHED } }),
      this.blogRepository.count({ where: { status: BlogStatus.DRAFT } }),
      this.blogRepository.count({ where: { status: BlogStatus.ARCHIVED } }),
      this.blogRepository.createQueryBuilder('blog').select('SUM(blog.viewCount)', 'total').getRawOne(),
    ]);
    return { total, published, draft, archived, totalViews: Number(viewsResult?.total) || 0 };
  }

  async batchPublish(ids: string[]): Promise<{ publishedCount: number }> {
    const result = await this.blogRepository.update(
      { id: In(ids) },
      { status: BlogStatus.PUBLISHED, publishedAt: new Date() },
    );
    return { publishedCount: result.affected || 0 };
  }

  async batchArchive(ids: string[]): Promise<{ archivedCount: number }> {
    const result = await this.blogRepository.update(
      { id: In(ids) },
      { status: BlogStatus.ARCHIVED },
    );
    return { archivedCount: result.affected || 0 };
  }

  async batchDelete(ids: string[]): Promise<{ deletedCount: number }> {
    const result = await this.blogRepository.delete({ id: In(ids) });
    return { deletedCount: result.affected || 0 };
  }

  async getRelated(id: string, limit = 4): Promise<Blog[]> {
    const blog = await this.findOne(id);

    return this.blogRepository
      .createQueryBuilder('blog')
      .where('blog.id != :id', { id })
      .andWhere('blog.status = :status', { status: BlogStatus.PUBLISHED })
      .andWhere('blog.category = :category', { category: blog.category })
      .orderBy('blog.publishedAt', 'DESC')
      .take(limit)
      .getMany();
  }
}