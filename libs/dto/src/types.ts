/**
 * Pure TypeScript types for Next.js (without decorators)
 * 仅用于 Next.js 项目的纯类型定义（不包含装饰器）
 */

import type { UserType, PermissionRole } from '@suggar-daddy/common';

// Auth Types
/** 登入請求 */
export interface LoginDto {
  email: string;
  password: string;
}

/** 註冊請求 */
export interface RegisterDto {
  email: string;
  password: string;
  /** 業務角色：使用者身份類型 */
  userType: UserType;
  displayName: string;
  bio?: string;
}

/** 刷新 Token 請求 */
export interface RefreshTokenDto {
  refreshToken: string;
}

/** Token 回應（登入/註冊/刷新） */
export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 秒
  tokenType: "Bearer";
}

/** 忘記密碼請求 */
export interface ForgotPasswordDto {
  email: string;
}

/** 重置密碼請求 */
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

/** 修改密碼請求 */
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

// User Types
export interface UserCardDto {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  /** 業務角色 */
  userType: UserType;
  /** 權限角色 */
  permissionRole: PermissionRole;
  verificationStatus: string;
  lastActiveAt: Date;
  city?: string;
  distance?: number;
}

export interface UserProfileDto {
  id: string;
  /** 業務角色 */
  userType: UserType;
  /** 權限角色 */
  permissionRole: PermissionRole;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: Date;
  preferences?: Record<string, unknown>;
  verificationStatus: string;
  lastActiveAt?: Date;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  /** 業務角色：使用者身份類型 */
  userType: UserType;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: string;
  preferences?: Record<string, unknown>;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
}

// Matching Types
export type SwipeAction = "like" | "pass" | "super_like";

export interface SwipeRequestDto {
  targetUserId: string;
  action: SwipeAction;
}

export interface SwipeResponseDto {
  matched: boolean;
  matchId?: string;
}

export interface MatchDto {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
  status: string;
}

export interface CardsResponseDto {
  cards: UserCardDto[];
  nextCursor?: string;
}

export interface MatchesResponseDto {
  matches: MatchDto[];
  nextCursor?: string;
}

// Messaging Types
export interface SendMessageDto {
  conversationId: string;
  content: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface ConversationDto {
  id: string;
  participantIds: string[];
  lastMessageAt?: Date;
}

export interface SendBroadcastDto {
  content: string;
  audience?: 'followers' | 'subscribers';
  mediaIds?: string[];
  recipientFilter?: 'ALL_SUBSCRIBERS' | 'TIER_SPECIFIC';
  tierIds?: string[];
}

export interface BroadcastDto {
  id: string;
  creatorId: string;
  content: string;
  audience: 'followers' | 'subscribers';
  recipientCount: number;
  createdAt: string;
}

export interface BroadcastResultDto {
  broadcastId: string;
  recipientCount: number;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  createdAt: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
}

// Notification Types
export interface SendNotificationDto {
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
