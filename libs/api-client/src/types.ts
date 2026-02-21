/**
 * API Client Type Definitions
 * 
 * 此檔案包含所有 API Client 使用的類型定義
 * 前端應用（admin/web）只需依賴此檔案，無需依賴後端模組
 */

// ============================================================
// 基礎 Enums
// ============================================================

/**
 * 業務角色：使用者註冊時選擇的身份類型
 */
export enum UserType {
  SUGAR_BABY = 'sugar_baby',
  SUGAR_DADDY = 'sugar_daddy',
}

/**
 * 權限角色：使用者在系統中的權限等級
 */
export enum PermissionRole {
  SUBSCRIBER = 'subscriber',  // 一般訂閱者
  CREATOR = 'creator',        // 內容創作者
  ADMIN = 'admin',            // 系統管理員
}

// ============================================================
// 分頁相關
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  cursor?: string;
  hasMore: boolean;
  total?: number;
}

// ============================================================
// Auth 相關類型
// ============================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  userType: UserType;
  displayName: string;
  bio?: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 秒
  tokenType: 'Bearer';
}

// ============================================================
// User 相關類型
// ============================================================

export interface UserCardDto {
  id: string;
  username?: string;
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
  username?: string;
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
  followerCount?: number;
  followingCount?: number;
  dmPrice?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileDto {
  username?: string;
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

export interface LocationUpdateDto {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

// ============================================================
// Matching 相關類型
// ============================================================

export type SwipeAction = 'like' | 'pass' | 'super_like';

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

// ============================================================
// Messaging 相關類型
// ============================================================

export interface MessageAttachmentDto {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface SendMessageDto {
  conversationId: string;
  content: string;
  attachments?: MessageAttachmentDto[];
}

export interface SendBroadcastDto {
  content: string;
  audience?: 'followers' | 'subscribers';
  mediaIds?: string[];
  recipientFilter?: 'ALL_SUBSCRIBERS' | 'TIER_SPECIFIC';
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

// ============================================================
// Notification 相關類型
// ============================================================

export interface SendNotificationDto {
  type: 'SYSTEM' | 'ANNOUNCEMENT' | 'PROMOTION' | 'WARNING';
  title: string;
  message: string;
  targetUsers?: 'ALL' | 'CREATORS' | 'SUBSCRIBERS' | 'SPECIFIC';
  userIds?: string[];
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  actionUrl?: string;
  expiresAt?: string;
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
