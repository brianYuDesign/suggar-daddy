import type { ApiClient } from './client';
import type {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './types';

/**
 * 基本成功回應
 */
export interface SuccessResponse {
  success: boolean;
  message?: string;
}

/**
 * 驗證電子郵件回應
 */
export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

/**
 * OAuth 回應（與 TokenResponse 相同）
 */
export type OAuthResponse = TokenResponseDto;

/**
 * Auth API Client
 * 
 * 提供完整的認證相關 API，包括：
 * - 基本認證（登入、註冊、登出、刷新）
 * - 電子郵件驗證系統
 * - 密碼管理（忘記、重置、變更）
 * - OAuth 登入（Google、Apple）
 * - 管理員帳號管理
 */
export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  // ========================================
  // 基本認證
  // ========================================

  /**
   * 登入
   * @param dto 登入資訊（email, password）
   * @returns Token 回應（accessToken, refreshToken）
   */
  login(dto: LoginDto) {
    return this.client.post<TokenResponseDto>('/api/auth/login', dto);
  }

  /**
   * 註冊新帳號
   * @param dto 註冊資訊（email, password, role, displayName）
   * @returns Token 回應（accessToken, refreshToken）
   */
  register(dto: RegisterDto) {
    return this.client.post<TokenResponseDto>('/api/auth/register', dto);
  }

  /**
   * 刷新 Access Token
   * @param dto Refresh Token
   * @returns 新的 Token 回應
   */
  refresh(dto: RefreshTokenDto) {
    return this.client.post<TokenResponseDto>('/api/auth/refresh', dto);
  }

  /**
   * 登出（需要認證）
   * @param refreshToken 要撤銷的 Refresh Token
   */
  logout(refreshToken?: string) {
    return this.client.post<void>('/api/auth/logout', refreshToken ? { refreshToken } : undefined);
  }

  // ========================================
  // 電子郵件驗證系統
  // ========================================

  /**
   * 驗證電子郵件
   * @param token 驗證 token（從郵件連結取得）
   * @returns 驗證結果
   * 
   * @example
   * ```typescript
   * const result = await authApi.verifyEmail('ev_1234567890');
   * console.log(result.message); // "Email verified successfully"
   * ```
   */
  verifyEmail(token: string) {
    return this.client.post<VerifyEmailResponse>(`/api/auth/verify-email/${token}`, {});
  }

  /**
   * 重新發送驗證信（需要認證）
   * @returns 成功回應
   * 
   * @example
   * ```typescript
   * const result = await authApi.resendVerification();
   * console.log(result.success); // true
   * ```
   */
  resendVerification() {
    return this.client.post<SuccessResponse>('/api/auth/resend-verification', {});
  }

  // ========================================
  // 密碼管理
  // ========================================

  /**
   * 忘記密碼 - 請求重置密碼連結
   * @param email 使用者電子郵件
   * @returns 成功回應（總是回傳 success 避免郵件列舉攻擊）
   * 
   * @example
   * ```typescript
   * const result = await authApi.forgotPassword('user@example.com');
   * console.log(result.success); // true
   * ```
   */
  forgotPassword(email: string) {
    const dto: ForgotPasswordDto = { email };
    return this.client.post<SuccessResponse>('/api/auth/forgot-password', dto);
  }

  /**
   * 重置密碼
   * @param token 重置 token（從郵件連結取得）
   * @param newPassword 新密碼（至少 8 個字元）
   * @returns 成功回應
   * 
   * @example
   * ```typescript
   * const result = await authApi.resetPassword('pr_1234567890', 'NewPassword123');
   * console.log(result.success); // true
   * ```
   */
  resetPassword(token: string, newPassword: string) {
    const dto: ResetPasswordDto = { token, newPassword };
    return this.client.post<SuccessResponse>('/api/auth/reset-password', dto);
  }

  /**
   * 變更密碼（需要認證）
   * @param oldPassword 舊密碼
   * @param newPassword 新密碼（至少 8 個字元）
   * @returns 成功回應
   * 
   * @example
   * ```typescript
   * const result = await authApi.changePassword('OldPassword123', 'NewPassword456');
   * console.log(result.success); // true
   * ```
   */
  changePassword(oldPassword: string, newPassword: string) {
    const dto: ChangePasswordDto = { oldPassword, newPassword };
    return this.client.post<SuccessResponse>('/api/auth/change-password', dto);
  }

  // ========================================
  // OAuth 登入
  // ========================================

  /**
   * 取得 Google OAuth 登入 URL
   * @param redirectUri 可選的重導向 URI（預設使用後端設定）
   * @returns Google OAuth URL
   * 
   * @example
   * ```typescript
   * const url = authApi.getGoogleLoginUrl();
   * window.location.href = url;
   * ```
   */
  getGoogleLoginUrl(redirectUri?: string): string {
    const baseUrl = '/api/auth/google';
    if (redirectUri) {
      return `${baseUrl}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
    return baseUrl;
  }

  /**
   * 處理 Google OAuth 回調
   * @param code OAuth authorization code（從 URL query 取得）
   * @returns Token 回應
   * 
   * @example
   * ```typescript
   * // 在 callback 頁面
   * const urlParams = new URLSearchParams(window.location.search);
   * const code = urlParams.get('code');
   * if (code) {
   *   const tokens = await authApi.handleGoogleCallback(code);
   *   // 儲存 tokens
   * }
   * ```
   */
  handleGoogleCallback(code: string) {
    return this.client.get<OAuthResponse>(`/api/auth/google/callback?code=${encodeURIComponent(code)}`);
  }

  /**
   * Apple OAuth 登入（使用 Sign in with Apple）
   * @param identityToken Apple 提供的 identity token
   * @param authorizationCode Apple 提供的 authorization code
   * @returns Token 回應
   * 
   * @example
   * ```typescript
   * // 從 Apple SDK 取得
   * const tokens = await authApi.appleLogin(identityToken, authorizationCode);
   * ```
   */
  appleLogin(identityToken: string, authorizationCode: string) {
    return this.client.post<OAuthResponse>('/api/auth/apple', {
      identityToken,
      authorizationCode,
    });
  }

  /**
   * 處理 Apple OAuth 回調
   * @param code OAuth authorization code
   * @returns Token 回應
   * 
   * @example
   * ```typescript
   * const tokens = await authApi.handleAppleCallback(code);
   * ```
   */
  handleAppleCallback(code: string) {
    return this.client.post<OAuthResponse>('/api/auth/apple/callback', { code });
  }

  // ========================================
  // Admin 帳號管理（需要 Admin 角色）
  // ========================================

  /**
   * 暫停使用者帳號（需要 Admin 權限）
   * @param userId 要暫停的使用者 ID
   * @param reason 可選的暫停原因
   * @returns 成功回應
   * 
   * @example
   * ```typescript
   * const result = await authApi.suspendUser('user123', '違反社群規範');
   * console.log(result.success); // true
   * ```
   */
  suspendUser(userId: string, reason?: string) {
    return this.client.post<SuccessResponse>(
      `/api/auth/admin/suspend/${userId}`,
      reason ? { reason } : {}
    );
  }

  /**
   * 封禁使用者帳號（需要 Admin 權限）
   * @param userId 要封禁的使用者 ID
   * @param reason 可選的封禁原因
   * @returns 成功回應
   * 
   * @example
   * ```typescript
   * const result = await authApi.banUser('user123', '嚴重違規');
   * console.log(result.success); // true
   * ```
   */
  banUser(userId: string, reason?: string) {
    return this.client.post<SuccessResponse>(
      `/api/auth/admin/ban/${userId}`,
      reason ? { reason } : {}
    );
  }

  /**
   * 重新啟用使用者帳號（需要 Admin 權限）
   * @param userId 要重新啟用的使用者 ID
   * @returns 成功回應
   * 
   * @example
   * ```typescript
   * const result = await authApi.reactivateUser('user123');
   * console.log(result.success); // true
   * ```
   */
  reactivateUser(userId: string) {
    return this.client.post<SuccessResponse>(`/api/auth/admin/reactivate/${userId}`, {});
  }
}
