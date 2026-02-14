export interface UserRecord {
  id: string;
  role: string;
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

export const FOLLOWING_SET = (userId: string): string => `user:following:${userId}`;
export const FOLLOWERS_SET = (userId: string): string => `user:followers:${userId}`;

export const BLOCK_SET = (userId: string): string => `user:blocks:${userId}`;
export const BLOCKED_BY_SET = (userId: string): string => `user:blocked-by:${userId}`;
export const REPORT_KEY = (id: string): string => `report:${id}`;
export const REPORTS_PENDING = 'reports:pending';
export const REPORTS_BY_USER = (userId: string): string => `reports:by:${userId}`;
