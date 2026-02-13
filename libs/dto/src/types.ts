/**
 * Pure TypeScript types for Next.js (without decorators)
 * 仅用于 Next.js 项目的纯类型定义（不包含装饰器）
 */

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
  role: "sugar_baby" | "sugar_daddy";
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

// User Types
export interface UserCardDto {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  verificationStatus: string;
  lastActiveAt: Date;
  city?: string;
  distance?: number;
}

export interface UserProfileDto {
  id: string;
  role: string;
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
  role: "sugar_baby" | "sugar_daddy";
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
