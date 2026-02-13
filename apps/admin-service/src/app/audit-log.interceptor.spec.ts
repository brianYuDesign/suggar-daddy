import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditLogService: jest.Mocked<Pick<AuditLogService, 'createLog'>>;

  const createMockContext = (method: string, url: string, user?: Record<string, string>, body?: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          path: url,
          user: user || { userId: 'admin-1' },
          body: body || null,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  const createMockHandler = (response: unknown = { success: true }): CallHandler => ({
    handle: () => of(response),
  });

  const createErrorHandler = (error: { message: string; status?: number }): CallHandler => ({
    handle: () => throwError(() => error),
  });

  beforeEach(() => {
    auditLogService = {
      createLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
    };

    interceptor = new AuditLogInterceptor(auditLogService as unknown as AuditLogService);
  });

  it('GET 請求不應記錄審計日誌', (done) => {
    const context = createMockContext('GET', '/api/admin/users');
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(auditLogService.createLog).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('POST 請求應記錄審計日誌', (done) => {
    const context = createMockContext(
      'POST',
      '/api/admin/users/550e8400-e29b-41d4-a716-446655440000/disable',
      { userId: 'admin-1' },
      { reason: 'test' },
    );
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        // createLog 是非同步呼叫，需要 tick
        setTimeout(() => {
          expect(auditLogService.createLog).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'POST',
              adminId: 'admin-1',
              statusCode: 200,
              path: expect.stringContaining('/disable'),
            }),
          );
          done();
        }, 10);
      },
    });
  });

  it('DELETE 請求應記錄審計日誌', (done) => {
    const context = createMockContext(
      'DELETE',
      '/api/admin/dlq/messages/msg-1',
      { userId: 'admin-2' },
    );
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(auditLogService.createLog).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'DELETE',
              adminId: 'admin-2',
              statusCode: 200,
            }),
          );
          done();
        }, 10);
      },
    });
  });

  it('PUT 請求應記錄審計日誌', (done) => {
    const context = createMockContext('PUT', '/api/admin/users/550e8400-e29b-41d4-a716-446655440000/role', { userId: 'admin-1' }, { role: 'CREATOR' });
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(auditLogService.createLog).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'PUT',
              adminId: 'admin-1',
              statusCode: 200,
              targetType: 'users',
              targetId: '550e8400-e29b-41d4-a716-446655440000',
            }),
          );
          done();
        }, 10);
      },
    });
  });

  it('請求錯誤時應記錄 error statusCode', (done) => {
    const context = createMockContext('POST', '/api/admin/users/batch/disable', { userId: 'admin-1' });
    const handler = createErrorHandler({ message: 'Not Found', status: 404 });

    interceptor.intercept(context, handler).subscribe({
      error: () => {
        setTimeout(() => {
          expect(auditLogService.createLog).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: 404,
            }),
          );
          done();
        }, 10);
      },
    });
  });

  it('user 不存在時 adminId 應為 unknown', (done) => {
    const context = createMockContext('POST', '/api/admin/dlq/retry-all', undefined);
    // 覆蓋 user 為空
    (context.switchToHttp().getRequest as any) = () => ({
      method: 'POST',
      url: '/api/admin/dlq/retry-all',
      user: null,
      body: null,
    });
    const handler = createMockHandler();

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/admin/dlq/retry-all',
          user: null,
          body: null,
        }),
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(ctx, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(auditLogService.createLog).toHaveBeenCalledWith(
            expect.objectContaining({
              adminId: 'unknown',
            }),
          );
          done();
        }, 10);
      },
    });
  });

  it('deriveAction 應從路徑產生有意義的 action', (done) => {
    const context = createMockContext(
      'POST',
      '/api/admin/reports/batch/resolve',
      { userId: 'admin-1' },
    );
    const handler = createMockHandler();

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        setTimeout(() => {
          expect(auditLogService.createLog).toHaveBeenCalledWith(
            expect.objectContaining({
              action: 'post.reports.batch.resolve',
            }),
          );
          done();
        }, 10);
      },
    });
  });

  it('createLog 失敗不應影響請求處理', (done) => {
    auditLogService.createLog.mockRejectedValue(new Error('DB write failed'));

    const context = createMockContext('POST', '/api/admin/users/batch/disable', { userId: 'admin-1' });
    const handler = createMockHandler({ success: true });

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toEqual({ success: true });
        done();
      },
    });
  });
});
