const TOKEN_KEY = 'admin_token';
const TOKEN_EXPIRY_KEY = 'admin_token_expiry';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

/**
 * JWT Payload 類型
 */
interface JWTPayload {
  sub: string; // userId
  userId?: string;
  email: string;
  role: string; // user type (sugar_daddy, sugar_baby)
  permissionRole: string; // admin, creator, subscriber
  exp: number;
  iat: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  // Check if token is expired
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (expiry && Date.now() > Number(expiry)) {
    clearToken();
    return null;
  }

  return token;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  
  // Also set as httpOnly-like cookie for middleware
  // Parse JWT to get expiration time
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      const expiryTime = payload.exp * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
      
      // Set cookie with same expiration
      const expiryDate = new Date(expiryTime);
      document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
    } else {
      // If JWT parsing fails, set 24h default expiry
      const defaultExpiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(defaultExpiry));
      
      const expiryDate = new Date(defaultExpiry);
      document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
    }
  } catch {
    // If JWT parsing fails, set 24h default expiry
    const defaultExpiry = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(defaultExpiry));
    
    const expiryDate = new Date(defaultExpiry);
    document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  
  // Also clear cookie
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/** Returns milliseconds until token expires, or 0 if expired/missing */
export function getTokenTTL(): number {
  if (typeof window === 'undefined') return 0;
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return 0;
  const ttl = Number(expiry) - Date.now();
  return ttl > 0 ? ttl : 0;
}

/**
 * 驗證 JWT token 並返回 payload
 * 注意：這只做基本的格式驗證和解碼，不驗證簽名
 * 簽名驗證應該在後端進行
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(atob(parts[1]));

    // 驗證必要字段 - sub 是 JWT 標準的用戶ID欄位
    if (!payload.sub || !payload.role || !payload.exp) {
      throw new Error('Invalid JWT payload');
    }

    // 向後兼容：如果沒有 userId，使用 sub
    if (!payload.userId) {
      payload.userId = payload.sub;
    }

    return payload as JWTPayload;
  } catch (error) {
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 檢查 token 是否已過期
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = verifyToken(token);
    const now = Math.floor(Date.now() / 1000); // 轉換為秒
    return payload.exp < now;
  } catch {
    return true; // 如果無法驗證，視為已過期
  }
}

/**
 * 獲取 token payload（不驗證簽名）
 */
export function getTokenPayload(token: string): JWTPayload | null {
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
