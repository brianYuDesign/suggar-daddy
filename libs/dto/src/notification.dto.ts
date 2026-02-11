/**
 * Notification 相關 DTO
 */
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export interface NotificationItemDto {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}
