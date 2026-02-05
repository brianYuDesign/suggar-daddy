/**
 * Auth 相關 DTO
 */

/** 登入請求 */
export interface LoginDto {
  email: string;
  password: string;
}

/** 註冊請求 */
export interface RegisterDto {
  email: string;
  password: string;
  role: 'sugar_baby' | 'sugar_daddy';
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
  tokenType: 'Bearer';
}
