/**
 * 前端用戶相關類型定義
 * 這些類型應該與後端 DTO 保持一致
 */

export interface UserCard {
  id?: string;
  userId?: string;
  username?: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  userType: string;
  permissionRole: string;
  verificationStatus?: string;
  isVerified?: boolean;
  lastActiveAt?: Date | string;
  city?: string;
  distance?: number;
}

export interface UserProfile {
  id: string;
  username?: string;
  userType: string;
  permissionRole: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: Date | string;
  preferences?: Record<string, unknown>;
  verificationStatus: string;
  lastActiveAt?: Date | string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}
