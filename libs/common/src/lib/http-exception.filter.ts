/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { BusinessException } from "./business-exception";
import { ErrorCode } from "./error-codes.enum";

/**
 * Standardized error response interface
 */
export interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  statusCode: number;
  correlationId?: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Global HTTP exception filter
 * Catches all exceptions and returns a standardized error response
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error with context
    this.logError(exception, request, errorResponse);

    // Send the standardized error response
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Build a standardized error response
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const correlationId = (request as any).correlationId;

    // Handle BusinessException
    if (exception instanceof BusinessException) {
      return {
        code: exception.code,
        message: exception.message,
        timestamp,
        path,
        method,
        statusCode: exception.getStatus(),
        correlationId,
        details: exception.details,
      };
    }

    // Handle standard NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let details: Record<string, any> | undefined;

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object") {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || exception.message;
        details = responseObj;
      } else {
        message = exception.message;
      }

      return {
        code: this.httpStatusToErrorCode(status),
        message,
        timestamp,
        path,
        method,
        statusCode: status,
        correlationId,
        details,
      };
    }

    // Handle unknown errors
    const message =
      exception instanceof Error ? exception.message : "Internal server error";
    const stack = exception instanceof Error ? exception.stack : undefined;

    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      timestamp,
      path,
      method,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      correlationId,
      stack: process.env["NODE_ENV"] === "development" ? stack : undefined,
    };
  }

  /**
   * Map HTTP status codes to error codes
   */
  private httpStatusToErrorCode(status: number): ErrorCode {
    const statusToCode: Record<number, ErrorCode> = {
      400: ErrorCode.VALIDATION_ERROR,
      401: ErrorCode.UNAUTHORIZED,
      403: ErrorCode.INSUFFICIENT_PERMISSIONS,
      404: ErrorCode.RESOURCE_NOT_FOUND,
      409: ErrorCode.RESOURCE_CONFLICT,
      422: ErrorCode.BUSINESS_RULE_VIOLATION,
      429: ErrorCode.RATE_LIMIT_EXCEEDED,
      500: ErrorCode.INTERNAL_SERVER_ERROR,
      502: ErrorCode.EXTERNAL_SERVICE_ERROR,
      503: ErrorCode.SERVICE_UNAVAILABLE,
    };

    return statusToCode[status] || ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Log error with context information
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponse,
  ) {
    const { method, url, ip, headers } = request;
    const userAgent = headers["user-agent"] || "unknown";
    const userId = (request as any).user?.id || "anonymous";

    const logContext = {
      errorCode: errorResponse.code,
      statusCode: errorResponse.statusCode,
      path: url,
      method,
      ip,
      userAgent,
      userId,
      timestamp: errorResponse.timestamp,
    };

    // Log based on severity
    if (errorResponse.statusCode >= 500) {
      // Server errors - log with full stack trace
      this.logger.error(
        `Server Error: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext, null, 2),
      );
    } else if (errorResponse.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(
        `Client Error: ${errorResponse.message}`,
        JSON.stringify(logContext, null, 2),
      );
    } else {
      // Other errors - log as info
      this.logger.log(
        `Error: ${errorResponse.message}`,
        JSON.stringify(logContext, null, 2),
      );
    }
  }
}
