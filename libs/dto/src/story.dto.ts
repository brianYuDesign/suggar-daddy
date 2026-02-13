/**
 * Story 相關 DTO (限時動態)
 */
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsString()
  @IsNotEmpty()
  mediaUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}

export interface StoryDto {
  id: string;
  creatorId: string;
  contentType: string;
  mediaUrl: string;
  caption: string | null;
  viewCount: number;
  expiresAt: string;
  createdAt: string;
  viewed?: boolean;
}

export interface StoryFeedItemDto {
  creatorId: string;
  displayName: string;
  avatarUrl?: string;
  hasUnviewed: boolean;
  latestStoryAt: string;
}

export interface StoryViewerDto {
  viewerId: string;
  displayName: string;
  avatarUrl?: string;
  viewedAt: string;
}
