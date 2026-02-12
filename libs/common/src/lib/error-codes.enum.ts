/**
 * Standard error codes for consistent error handling across the application
 */
export enum ErrorCode {
  // Authentication & Authorization (1xxx)
  UNAUTHORIZED = 'ERR_1001',
  INVALID_TOKEN = 'ERR_1002',
  TOKEN_EXPIRED = 'ERR_1003',
  INSUFFICIENT_PERMISSIONS = 'ERR_1004',
  INVALID_CREDENTIALS = 'ERR_1005',

  // Validation Errors (2xxx)
  VALIDATION_ERROR = 'ERR_2001',
  INVALID_INPUT = 'ERR_2002',
  MISSING_REQUIRED_FIELD = 'ERR_2003',
  INVALID_FORMAT = 'ERR_2004',
  DUPLICATE_ENTRY = 'ERR_2005',

  // Resource Errors (3xxx)
  RESOURCE_NOT_FOUND = 'ERR_3001',
  RESOURCE_ALREADY_EXISTS = 'ERR_3002',
  RESOURCE_CONFLICT = 'ERR_3003',
  RESOURCE_LOCKED = 'ERR_3004',

  // Business Logic Errors (4xxx)
  BUSINESS_RULE_VIOLATION = 'ERR_4001',
  INSUFFICIENT_BALANCE = 'ERR_4002',
  PAYMENT_FAILED = 'ERR_4003',
  SUBSCRIPTION_INACTIVE = 'ERR_4004',
  OPERATION_NOT_ALLOWED = 'ERR_4005',

  // System Errors (5xxx)
  INTERNAL_SERVER_ERROR = 'ERR_5001',
  SERVICE_UNAVAILABLE = 'ERR_5002',
  DATABASE_ERROR = 'ERR_5003',
  EXTERNAL_SERVICE_ERROR = 'ERR_5004',
  CONFIGURATION_ERROR = 'ERR_5005',

  // Rate Limiting (6xxx)
  RATE_LIMIT_EXCEEDED = 'ERR_6001',
  TOO_MANY_REQUESTS = 'ERR_6002',

  // Unknown/Generic
  UNKNOWN_ERROR = 'ERR_9999',
}

/**
 * Error code to HTTP status mapping
 */
export const ERROR_CODE_TO_HTTP_STATUS: Record<ErrorCode, number> = {
  // Authentication & Authorization
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.INVALID_CREDENTIALS]: 401,

  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.DUPLICATE_ENTRY]: 409,

  // Resource Errors
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.RESOURCE_LOCKED]: 423,

  // Business Logic Errors
  [ErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCode.INSUFFICIENT_BALANCE]: 402,
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.SUBSCRIPTION_INACTIVE]: 403,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 403,

  // System Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.CONFIGURATION_ERROR]: 500,

  // Rate Limiting
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,

  // Unknown/Generic
  [ErrorCode.UNKNOWN_ERROR]: 500,
};