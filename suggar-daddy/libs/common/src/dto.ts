import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

// Pagination
export class PaginationDto {
  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  cursor?: string;
}

// Base Response
export class BaseResponseDto {
  success: boolean;
  message?: string;
}

// Auth DTOs
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}

// Swipe DTO
export class SwipeDto {
  @IsUUID()
  targetUserId: string;

  @IsString()
  action: 'like' | 'pass' | 'super_like';
}
