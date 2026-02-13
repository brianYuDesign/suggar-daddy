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
  content: string;

  @IsOptional()
  @IsIn(['followers', 'subscribers'])
  audience?: 'followers' | 'subscribers';
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
  id: string;
  creatorId: string;
  content: string;
  audience: string;
  recipientCount: number;
  createdAt: string;
}
