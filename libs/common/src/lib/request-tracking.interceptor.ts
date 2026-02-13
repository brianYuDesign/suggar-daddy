/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Request Tracking Interceptor
 *
 * 功能：
 * 1. 為每個請求生成唯一的 Correlation ID
 * 2. 記錄請求開始和結束時間
 * 3. 記錄請求的詳細資訊（耗時、狀態碼等）
 * 4. 在錯誤發生時自動附加 Correlation ID
 */
@Injectable()
export class RequestTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestTrackingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 生成或獲取 Correlation ID
    const correlationId =
      (request.headers["x-correlation-id"] as string) ||
      (request.headers["x-request-id"] as string) ||
      uuidv4();

    // 將 Correlation ID 附加到 request 對象
    (request as any).correlationId = correlationId;

    // 將 Correlation ID 添加到響應頭
    response.setHeader("X-Correlation-ID", correlationId);

    const startTime = Date.now();
    const { method, url, ip } = request;
    const userAgent = request.get("user-agent") || "";

    // 記錄請求開始
    this.logger.log(
      `[${correlationId}] ${method} ${url} - Started (IP: ${ip}, UA: ${userAgent})`,
    );

    return next.handle().pipe(
      tap(() => {
        // 記錄成功響應
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.logger.log(
          `[${correlationId}] ${method} ${url} - ${statusCode} ${duration}ms`,
        );
      }),
      catchError((error) => {
        // 記錄錯誤響應
        const duration = Date.now() - startTime;

        this.logger.error(
          `[${correlationId}] ${method} ${url} - Error (${duration}ms)`,
          error.stack,
        );

        // 將 Correlation ID 附加到錯誤對象
        if (error && typeof error === "object") {
          error.correlationId = correlationId;
        }

        return throwError(() => error);
      }),
    );
  }
}
