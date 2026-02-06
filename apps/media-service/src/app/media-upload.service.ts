import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaUpload } from './entities/media-upload.entity';
import { CreateMediaUploadDto } from './dto/media-upload.dto';

@Injectable()
export class MediaUploadService {
  constructor(
    @InjectRepository(MediaUpload)
    private readonly mediaUploadRepository: Repository<MediaUpload>,
  ) {}

  async create(createDto: CreateMediaUploadDto): Promise<MediaUpload> {
    const mediaUpload = this.mediaUploadRepository.create(createDto);
    return this.mediaUploadRepository.save(mediaUpload);
  }

  async findAll(): Promise<MediaUpload[]> {
    return this.mediaUploadRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findByUser(userId: string): Promise<MediaUpload[]> {
    return this.mediaUploadRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<MediaUpload> {
    const mediaUpload = await this.mediaUploadRepository.findOne({ where: { id } });
    if (!mediaUpload) {
      throw new NotFoundException(`Media upload with ID ${id} not found`);
    }
    return mediaUpload;
  }

  async remove(id: string): Promise<void> {
    const mediaUpload = await this.findOne(id);
    await this.mediaUploadRepository.remove(mediaUpload);
  }
}
