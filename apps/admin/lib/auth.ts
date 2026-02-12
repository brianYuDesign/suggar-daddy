const TOKEN_KEY = 'admin_token';
const TOKEN_EXPIRY_KEY = 'admin_token_expiry';

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
  // Parse JWT to get expiration time
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, String(payload.exp * 1000));
    }
  } catch {
    // If JWT parsing fails, set 24h default expiry
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
  }
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
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
