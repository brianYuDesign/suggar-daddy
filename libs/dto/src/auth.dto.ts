/**
 * Auth 相關 DTO
 */
import { IsEmail, IsNotEmpty, IsString, IsIn, IsOptional, MinLength, MaxLength } from 'class-validator';

/** 登入請求 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

/** 註冊請求 */
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

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
}

/** 刷新 Token 請求 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/** Token 回應（登入/註冊/刷新） */
export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 秒
  tokenType: 'Bearer';
}
