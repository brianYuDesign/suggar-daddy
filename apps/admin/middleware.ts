import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, isTokenExpired } from './lib/auth';

/**
 * Admin 應用 Middleware - 權限檢查
 * 
 * 功能：
 * 1. 驗證 JWT token 是否存在和有效
 * 2. 檢查用戶角色是否為 ADMIN
 * 3. 防止未授權訪問
 * 4. 記錄可疑的訪問嘗試
 */

// 不需要驗證的路徑
const PUBLIC_PATHS = ['/login'];

// 需要額外權限的敏感路徑
const SENSITIVE_PATHS = [
  '/system',
  '/audit-log',
  '/users/[userId]/edit', // 編輯用戶
  '/withdrawals', // 提款審核
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 允許公開頁面
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 允許靜態資源和 API 路由
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 檢查 token
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    console.warn('[Middleware] No token found, redirecting to login:', {
      pathname,
      ip: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 驗證 token 有效性
  try {
    const payload = verifyToken(token);

    // 檢查 token 是否過期
    if (isTokenExpired(token)) {
      console.warn('[Middleware] Token expired, redirecting to login:', {
        pathname,
        userId: payload.userId,
      });

      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('admin_token');
      return response;
    }

    // 檢查角色權限 - 使用 permissionRole，統一轉小寫比較（允許 admin 和 super_admin）
    const permRole = payload.permissionRole?.toLowerCase();
    if (permRole !== 'admin' && permRole !== 'super_admin') {
      console.error('[Middleware] Unauthorized access attempt:', {
        pathname,
        userId: payload.userId,
        role: payload.role,
        permissionRole: payload.permissionRole,
        ip: request.ip,
      });

      // 返回 403 禁止訪問
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource.',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 敏感路徑額外檢查
    const isSensitivePath = SENSITIVE_PATHS.some(
      (path) => pathname.startsWith(path) || pathname.includes(path)
    );

    if (isSensitivePath) {
      // 記錄敏感操作訪問
      console.info('[Middleware] Sensitive path access:', {
        pathname,
        userId: payload.userId,
        timestamp: new Date().toISOString(),
      });

      // 可以在這裡添加額外的驗證邏輯
      // 例如：檢查特定權限、二次驗證等
    }

    // 將用戶信息添加到請求頭（可選）
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub || payload.userId || '');
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-permission-role', payload.permissionRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('[Middleware] Token verification failed:', {
      pathname,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: request.ip,
    });

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('admin_token');
    return response;
  }
}

/**
 * Middleware 配置
 * 匹配除靜態文件外的所有路徑
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路徑除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
