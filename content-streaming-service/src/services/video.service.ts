import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, VideoStatus } from '@/entities/video.entity';
import { VideoQuality } from '@/entities/video-quality.entity';
import { CreateVideoDto, UpdateVideoDto, VideoResponseDto } from '@/dtos/video.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(VideoQuality)
    private qualityRepository: Repository<VideoQuality>,
  ) {}

  async createVideo(
    creatorId: string,
    createVideoDto: CreateVideoDto,
    uploadedFile: { filename: string; size: number; s3Key: string; mimeType: string },
  ): Promise<VideoResponseDto> {
    const video = this.videoRepository.create({
      creator_id: creatorId,
      title: createVideoDto.title,
      description: createVideoDto.description,
      original_filename: uploadedFile.filename,
      s3_key: uploadedFile.s3Key,
      mime_type: uploadedFile.mimeType,
      file_size: uploadedFile.size,
      duration_seconds: 0, // Will be set during transcoding
      status: VideoStatus.PROCESSING,
      subscription_level: createVideoDto.subscription_level || 0,
    });

    return this.toResponseDto(await this.videoRepository.save(video));
  }

  async getVideo(videoId: string, creatorId?: string): Promise<VideoResponseDto> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['qualities'],
    });

    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    // Check authorization if creator context is provided
    if (creatorId && video.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to access this video');
    }

    return this.toResponseDto(video);
  }

  async listVideos(creatorId: string, limit: number = 20, offset: number = 0): Promise<{ data: VideoResponseDto[]; total: number }> {
    const [videos, total] = await this.videoRepository.findAndCount({
      where: { creator_id: creatorId },
      relations: ['qualities'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });

    return {
      data: videos.map((v) => this.toResponseDto(v)),
      total,
    };
  }

  async updateVideo(videoId: string, creatorId: string, updateDto: UpdateVideoDto): Promise<VideoResponseDto> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['qualities'],
    });

    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    if (video.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to update this video');
    }

    Object.assign(video, updateDto);
    return this.toResponseDto(await this.videoRepository.save(video));
  }

  async deleteVideo(videoId: string, creatorId: string): Promise<void> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    if (video.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to delete this video');
    }

    await this.videoRepository.remove(video);
  }

  async publishVideo(videoId: string, creatorId: string): Promise<VideoResponseDto> {
    const video = await this.videoRepository.findOne({
      where: { id: videoId },
      relations: ['qualities'],
    });

    if (!video) {
      throw new NotFoundException(`Video ${videoId} not found`);
    }

    if (video.creator_id !== creatorId) {
      throw new BadRequestException('Not authorized to publish this video');
    }

    if (video.status !== VideoStatus.READY) {
      throw new BadRequestException('Video is not ready for publishing. Status: ' + video.status);
    }

    video.is_published = true;
    return this.toResponseDto(await this.videoRepository.save(video));
  }

  async setVideoStatus(videoId: string, status: VideoStatus): Promise<void> {
    await this.videoRepository.update({ id: videoId }, { status });
  }

  private toResponseDto(video: Video): VideoResponseDto {
    return {
      id: video.id,
      creator_id: video.creator_id,
      title: video.title,
      description: video.description,
      status: video.status as any,
      duration_seconds: video.duration_seconds,
      file_size: video.file_size,
      thumbnail_url: video.thumbnail_url,
      preview_url: video.preview_url,
      is_published: video.is_published,
      subscription_level: video.subscription_level,
      qualities: video.qualities?.map((q) => ({
        id: q.id,
        quality_name: q.quality_name,
        width: q.width,
        height: q.height,
        bitrate: q.bitrate,
        fps: q.fps,
        cdn_url: q.cdn_url,
        is_ready: q.is_ready,
      })) || [],
      created_at: video.created_at,
      updated_at: video.updated_at,
    };
  }
}
