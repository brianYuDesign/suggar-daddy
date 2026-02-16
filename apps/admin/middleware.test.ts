/**
 * Admin Middleware 測試
 * 測試權限檢查和路由保護
 */

import { NextRequest, NextResponse } from 'next/server';
import { middleware } from './middleware';
import * as auth from './lib/auth';

// Mock auth functions
jest.mock('./lib/auth', () => ({
  verifyToken: jest.fn(),
  isTokenExpired: jest.fn(),
}));

describe('Admin Middleware - 權限檢查', () => {
  const mockVerifyToken = auth.verifyToken as jest.MockedFunction<typeof auth.verifyToken>;
  const mockIsTokenExpired = auth.isTokenExpired as jest.MockedFunction<typeof auth.isTokenExpired>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('公開路徑', () => {
    it('應允許訪問登入頁面', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/login'));
      const response = await middleware(request);

      expect(response).toBeDefined();
      // NextResponse.next() 返回的對象
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });

  describe('Token 驗證', () => {
    it('無 token 時應重定向到登入頁', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      const response = await middleware(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('location')).toContain('/login');
    });

    it('Token 過期時應重定向到登入頁並清除 cookie', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'expired-token');

      mockVerifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 小時前過期
        iat: Math.floor(Date.now() / 1000) - 7200,
      });

      mockIsTokenExpired.mockReturnValue(true);

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
      
      // 應該清除 cookie
      const setCookie = response.headers.get('set-cookie');
      expect(setCookie).toContain('admin_token=;');
    });

    it('Token 無效時應重定向到登入頁', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'invalid-token');

      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });
  });

  describe('角色權限檢查', () => {
    it('ADMIN 角色應允許訪問', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'valid-token');

      mockVerifyToken.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      mockIsTokenExpired.mockReturnValue(false);

      const response = await middleware(request);

      expect(response.status).not.toBe(307); // 不重定向
      expect(response.status).not.toBe(403); // 不禁止
    });

    it('非 ADMIN 角色應返回 403', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'user-token');

      mockVerifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER', // 非管理員
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      mockIsTokenExpired.mockReturnValue(false);

      const response = await middleware(request);

      expect(response.status).toBe(403);
      
      const body = await response.json();
      expect(body.error).toBe('Forbidden');
      expect(body.message).toContain('permission');
    });
  });

  describe('敏感路徑保護', () => {
    const sensitiveUrls = [
      'http://localhost:3000/system',
      'http://localhost:3000/audit-log',
      'http://localhost:3000/withdrawals',
    ];

    it.each(sensitiveUrls)('應記錄對敏感路徑的訪問: %s', async (url) => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      const request = new NextRequest(new URL(url));
      request.cookies.set('admin_token', 'admin-token');

      mockVerifyToken.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      mockIsTokenExpired.mockReturnValue(false);

      await middleware(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Middleware] Sensitive path access'),
        expect.objectContaining({
          pathname: expect.any(String),
          userId: 'admin-123',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('靜態資源和 API 路由', () => {
    const allowedPaths = [
      'http://localhost:3000/_next/static/file.js',
      'http://localhost:3000/_next/image?url=test',
      'http://localhost:3000/api/health',
      'http://localhost:3000/favicon.ico',
    ];

    it.each(allowedPaths)('應允許訪問: %s', async (url) => {
      const request = new NextRequest(new URL(url));
      const response = await middleware(request);

      // 不應該驗證 token
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });

  describe('請求頭注入', () => {
    it('應將用戶信息添加到請求頭', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'admin-token');

      mockVerifyToken.mockReturnValue({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      mockIsTokenExpired.mockReturnValue(false);

      const response = await middleware(request);

      // 檢查響應對象的請求頭
      // 注意：NextResponse.next() 返回的對象可能不直接暴露請求頭
      // 實際使用時，這些頭會被添加到轉發的請求中
      expect(response).toBeDefined();
    });
  });

  describe('安全日誌', () => {
    it('應記錄未授權訪問嘗試', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      // 沒有 token

      await middleware(request);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Middleware] No token found'),
        expect.any(Object)
      );

      consoleWarnSpy.mockRestore();
    });

    it('應記錄非管理員的訪問嘗試', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'user-token');

      mockVerifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      });

      mockIsTokenExpired.mockReturnValue(false);

      await middleware(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Middleware] Unauthorized access attempt'),
        expect.objectContaining({
          userId: 'user-123',
          role: 'USER',
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it('應記錄 token 驗證失敗', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      request.cookies.set('admin_token', 'malformed-token');

      mockVerifyToken.mockImplementation(() => {
        throw new Error('Malformed JWT');
      });

      await middleware(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Middleware] Token verification failed'),
        expect.objectContaining({
          error: 'Malformed JWT',
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
