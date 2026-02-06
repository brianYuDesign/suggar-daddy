/**
 * User 相關 DTO
 */

export interface UserCardDto {
  id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  verificationStatus: string;
  lastActiveAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

/** 創建用戶（註冊） */
export interface CreateUserDto {
  role: 'sugar_baby' | 'sugar_daddy';
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: string;
}

/** 更新個人資料（部分欄位） */
export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: string;
  preferences?: Record<string, unknown>;
}
