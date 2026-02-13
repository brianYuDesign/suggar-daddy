import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogService } from './audit-log.service';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (!AUDITED_METHODS.has(method)) {
      return next.handle();
    }

    const path: string = request.url || request.path;
    const adminId: string = request.user?.userId || request.user?.sub || 'unknown';
    const action = this.deriveAction(method, path);
    const { targetType, targetId } = this.extractTarget(path);
    const details = request.body ? JSON.stringify(request.body) : null;

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditLogService
            .createLog({
              action,
              adminId,
              targetType,
              targetId,
              details,
              method,
              path,
              statusCode: 200,
            })
            .catch((err) =>
              this.logger.warn('Failed to write audit log: ' + err.message),
            );
        },
        error: (err) => {
          this.auditLogService
            .createLog({
              action,
              adminId,
              targetType,
              targetId,
              details,
              method,
              path,
              statusCode: err.status || 500,
            })
            .catch((logErr) =>
              this.logger.warn('Failed to write audit log: ' + logErr.message),
            );
        },
      }),
    );
  }

  private deriveAction(method: string, path: string): string {
    // Extract meaningful action from path: e.g. POST /users/:id/disable -> users.disable
    const segments = path
      .replace(/^\/api\/admin\//, '')
      .split('/')
      .filter(Boolean);

    // Remove UUID-like segments
    const meaningful = segments.filter(
      (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
    );

    if (meaningful.length > 0) {
      return `${method.toLowerCase()}.${meaningful.join('.')}`;
    }
    return `${method.toLowerCase()}.unknown`;
  }

  private extractTarget(path: string): { targetType?: string; targetId?: string } {
    const segments = path.replace(/^\/api\/admin\//, '').split('/').filter(Boolean);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    for (let i = 0; i < segments.length; i++) {
      if (uuidPattern.test(segments[i]) && i > 0) {
        return { targetType: segments[i - 1], targetId: segments[i] };
      }
    }
    return {};
  }
}
