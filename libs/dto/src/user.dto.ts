/**
 * User 相關 DTO
 */
import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength, MinLength, Matches, IsDateString, IsNumber, Min, Max, IsBoolean, IsInt } from 'class-validator';
import { UserType, PermissionRole } from '@suggar-daddy/common';

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

/** 創建用戶（註冊） */
export class CreateUserDto {
  @IsEnum(UserType, { message: 'userType must be either sugar_baby or sugar_daddy' })
  userType: UserType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;
}

/** 更新個人資料（部分欄位） */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers and underscores' })
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  preferences?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(80)
  preferredAgeMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(80)
  preferredAgeMax?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  preferredDistance?: number;

  @IsOptional()
  @IsString()
  preferredUserType?: 'sugar_daddy' | 'sugar_baby' | 'both';

  @IsOptional()
  @IsBoolean()
  chatDiamondGateEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  chatDiamondThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  chatDiamondCost?: number;
}

/** 位置更新（專用端點） */
export class LocationUpdateDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
