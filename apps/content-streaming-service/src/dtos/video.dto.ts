import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum VideoStatusEnum {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

export class CreateVideoDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  @Transform(({ value }) => parseInt(value))
  subscription_level?: number;
}

export class UpdateVideoDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  subscription_level?: number;
}

export class VideoResponseDto {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  status: VideoStatusEnum;
  duration_seconds: number;
  file_size: number;
  thumbnail_url?: string;
  preview_url?: string;
  is_published: boolean;
  subscription_level?: number;
  qualities: VideoQualityResponseDto[];
  created_at: Date;
  updated_at: Date;
}

export class VideoQualityResponseDto {
  id: string;
  quality_name: string;
  width: number;
  height: number;
  bitrate: string;
  fps: number;
  cdn_url?: string;
  is_ready: boolean;
}

export class InitiateUploadDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  content_type: string;

  @IsNumber()
  @IsNotEmpty()
  file_size: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  chunk_size?: number; // default 5MB
}

export class CompleteUploadDto {
  @IsString()
  @IsNotEmpty()
  session_id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  subscription_level?: number;
}

export class UploadSessionResponseDto {
  id: string;
  filename: string;
  file_size: number;
  chunk_size: number;
  total_chunks: number;
  uploaded_chunks: string[];
  is_completed: boolean;
}

export class StreamPlaylistDto {
  video_id: string;
  qualities: QualityPlaylistDto[];
  default_quality: string;
}

export class QualityPlaylistDto {
  quality_name: string;
  resolution: string;
  bitrate: string;
  cdn_url: string;
}
