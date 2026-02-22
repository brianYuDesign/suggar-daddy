import type { UserType, PermissionRole } from '@suggar-daddy/common';

export interface UserRecord {
  id: string;
  /** 唯一用戶名（handle），如 alice123 */
  username?: string;
  /** 業務角色：sugar_baby or sugar_daddy */
  userType: UserType;
  /** 權限角色：subscriber, creator, admin */
  permissionRole: PermissionRole;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: Date;
  latitude?: number;
  longitude?: number;
  city?: string;
  country?: string;
  locationUpdatedAt?: Date;
  preferences: Record<string, unknown>;
  verificationStatus: string;
  lastActiveAt: Date;
  followerCount: number;
  followingCount: number;
  dmPrice?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  targetType: 'user' | 'post' | 'comment';
  targetId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: string;
}

export const GEO_KEY = 'geo:users';
/** Set of all user IDs (avoids SCAN on user:* keyspace) */
export const USERS_ALL_SET = 'users:all';
/** Set of all creator user IDs */
export const CREATORS_SET = 'users:creators';

export const USERNAME_KEY = (username: string): string => `user:username:${username}`;

export const FOLLOWING_SET = (userId: string): string => `user:following:${userId}`;
export const FOLLOWERS_SET = (userId: string): string => `user:followers:${userId}`;

export const BLOCK_SET = (userId: string): string => `user:blocks:${userId}`;
export const BLOCKED_BY_SET = (userId: string): string => `user:blocked-by:${userId}`;
export const REPORT_KEY = (id: string): string => `report:${id}`;
export const REPORTS_PENDING = 'reports:pending';
export const REPORTS_BY_USER = (userId: string): string => `reports:by:${userId}`;

// Profile views
export const PROFILE_VIEWERS = (userId: string): string => `profile:viewers:${userId}`;
export const PROFILE_VIEW_DEDUP = (viewedId: string, viewerId: string): string =>
  `profile:view:dedup:${viewedId}:${viewerId}`;
export const PROFILE_VIEW_COUNT = (userId: string): string => `profile:view:count:${userId}`;

// Verification
export const VERIFICATION_KEY = (userId: string): string => `verification:${userId}`;
