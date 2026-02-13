/**
 * User 相關 DTO
 */
import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength, IsDateString, IsNumber, Min, Max } from 'class-validator';

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
  followerCount?: number;
  followingCount?: number;
  dmPrice?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** 創建用戶（註冊） */
export class CreateUserDto {
  @IsIn(['sugar_baby', 'sugar_daddy'])
  role: 'sugar_baby' | 'sugar_daddy';

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
