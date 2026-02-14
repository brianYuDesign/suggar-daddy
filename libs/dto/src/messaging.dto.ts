/**
 * Messaging 相關 DTO
 */
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageAttachmentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsIn(['image', 'video'])
  type: 'image' | 'video';

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

export class SendBroadcastDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];

  @IsOptional()
  @IsIn(['ALL_SUBSCRIBERS', 'TIER_SPECIFIC'])
  recipientFilter?: 'ALL_SUBSCRIBERS' | 'TIER_SPECIFIC';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tierIds?: string[];
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: MessageAttachmentDto[];
  createdAt: Date;
}

export interface ConversationDto {
  id: string;
  participantIds: string[];
  lastMessageAt?: Date;
}

export interface BroadcastDto {
  broadcastId: string;
  senderId: string;
  senderUsername: string;
  message: string;
  mediaUrls?: string[];
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  createdAt: string;
}

export interface BroadcastResultDto {
  broadcastId: string;
  recipientCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  createdAt: string;
}
