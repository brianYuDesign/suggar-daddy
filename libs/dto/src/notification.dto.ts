/**
 * Notification 相關 DTO
 */
import { IsString, IsNotEmpty, IsOptional, IsObject, IsIn, IsArray, IsDateString } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['SYSTEM', 'ANNOUNCEMENT', 'PROMOTION', 'WARNING'])
  type: 'SYSTEM' | 'ANNOUNCEMENT' | 'PROMOTION' | 'WARNING';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsIn(['ALL', 'CREATORS', 'SUBSCRIBERS', 'SPECIFIC'])
  targetUsers?: 'ALL' | 'CREATORS' | 'SUBSCRIBERS' | 'SPECIFIC';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsString()
  @IsNotEmpty()
  @IsIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * Internal notification DTO used by notification-service for programmatic sends
 * (e.g., from Kafka consumers). Not validated via class-validator.
 */
export interface InternalSendNotificationDto {
  userId: string;
  type: string;
  title: string;
  body?: string;
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

export interface NotificationResultDto {
  notificationId: string;
  targetCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT';
  createdAt: string;
}
