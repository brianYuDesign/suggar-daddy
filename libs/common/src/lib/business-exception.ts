import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ERROR_CODE_TO_HTTP_STATUS } from './error-codes.enum';

/**
 * Base class for all business exceptions
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, any>,
    statusCode?: number,
  ) {
    const status = statusCode ?? ERROR_CODE_TO_HTTP_STATUS[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
    super(
      {
        code,
        message,
        details,
      },
      status,
    );
  }
}

/**
 * Validation Exception - thrown when input validation fails
 */
export class ValidationException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

/**
 * Unauthorized Exception - thrown when authentication fails
 */
export class UnauthorizedException extends BusinessException {
  constructor(message = 'Unauthorized access', details?: Record<string, any>) {
    super(ErrorCode.UNAUTHORIZED, message, details);
  }
}

/**
 * Forbidden Exception - thrown when user lacks permissions
 */
export class ForbiddenException extends BusinessException {
  constructor(message = 'Insufficient permissions', details?: Record<string, any>) {
    super(ErrorCode.INSUFFICIENT_PERMISSIONS, message, details);
  }
}

/**
 * Not Found Exception - thrown when resource is not found
 */
export class NotFoundException extends BusinessException {
  constructor(resource: string, identifier?: string | number, details?: Record<string, any>) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(ErrorCode.RESOURCE_NOT_FOUND, message, details);
  }
}

/**
 * Conflict Exception - thrown when resource already exists or conflicts
 */
export class ConflictException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.RESOURCE_CONFLICT, message, details);
  }
}

/**
 * Payment Exception - thrown when payment operations fail
 */
export class PaymentException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.PAYMENT_FAILED, message, details);
  }
}

/**
 * Insufficient Balance Exception - thrown when user has insufficient balance
 */
export class InsufficientBalanceException extends BusinessException {
  constructor(required: number, available: number, details?: Record<string, any>) {
    super(
      ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance. Required: ${required}, Available: ${available}`,
      { required, available, ...details },
    );
  }
}

/**
 * Subscription Exception - thrown when subscription is inactive or invalid
 */
export class SubscriptionException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.SUBSCRIPTION_INACTIVE, message, details);
  }
}

/**
 * Business Rule Violation Exception - thrown when business rules are violated
 */
export class BusinessRuleViolationException extends BusinessException {
  constructor(rule: string, details?: Record<string, any>) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, `Business rule violation: ${rule}`, details);
  }
}

/**
 * Rate Limit Exception - thrown when rate limit is exceeded
 */
export class RateLimitException extends BusinessException {
  constructor(message = 'Rate limit exceeded', retryAfter?: number, details?: Record<string, any>) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, {
      retryAfter,
      ...details,
    });
  }
}

/**
 * Database Exception - thrown when database operations fail
 */
export class DatabaseException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super(ErrorCode.DATABASE_ERROR, message, details, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

/**
 * External Service Exception - thrown when external service calls fail
 */
export class ExternalServiceException extends BusinessException {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service '${service}' error: ${message}`,
      details,
      HttpStatus.BAD_GATEWAY,
    );
  }
}

/**
 * Invalid Token Exception - thrown when JWT token is invalid
 */
export class InvalidTokenException extends BusinessException {
  constructor(message = 'Invalid or malformed token', details?: Record<string, any>) {
    super(ErrorCode.INVALID_TOKEN, message, details);
  }
}

/**
 * Token Expired Exception - thrown when JWT token has expired
 */
export class TokenExpiredException extends BusinessException {
  constructor(message = 'Token has expired', details?: Record<string, any>) {
    super(ErrorCode.TOKEN_EXPIRED, message, details);
  }
}