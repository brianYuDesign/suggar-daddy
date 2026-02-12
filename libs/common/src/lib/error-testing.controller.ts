import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ValidationException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  PaymentException,
  InsufficientBalanceException,
  SubscriptionException,
} from "./business-exception";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * 錯誤處理測試 Controller
 *
 * 用於測試統一錯誤處理系統的各種異常類型
 *
 * ⚠️ 僅供開發和測試環境使用
 * 生產環境應該移除或禁用此 Controller
 */
@Controller("_debug/errors")
export class ErrorTestingController {
  /**
   * 測試驗證錯誤
   * GET /_debug/errors/validation
   */
  @Get("validation")
  testValidationError() {
    throw new ValidationException("Invalid input data", {
      field: "email",
      expected: "valid email format",
      actual: "not-an-email",
    });
  }

  /**
   * 測試資源未找到錯誤
   * GET /_debug/errors/not-found
   */
  @Get("not-found")
  testNotFoundError(@Query("resource") resource = "User") {
    throw new NotFoundException(resource, "12345");
  }

  /**
   * 測試衝突錯誤
   * GET /_debug/errors/conflict
   */
  @Get("conflict")
  testConflictError() {
    throw new ConflictException("User with this email already exists", {
      email: "test@example.com",
    });
  }

  /**
   * 測試未授權錯誤
   * GET /_debug/errors/unauthorized
   */
  @Get("unauthorized")
  testUnauthorizedError() {
    throw new UnauthorizedException("Invalid token");
  }

  /**
   * 測試禁止訪問錯誤
   * GET /_debug/errors/forbidden
   */
  @Get("forbidden")
  @UseGuards(JwtAuthGuard)
  testForbiddenError() {
    throw new ForbiddenException(
      "You do not have permission to access this resource",
    );
  }

  /**
   * 測試支付錯誤
   * GET /_debug/errors/payment
   */
  @Get("payment")
  testPaymentError() {
    throw new PaymentException("Payment processing failed", {
      provider: "Stripe",
      errorCode: "card_declined",
    });
  }

  /**
   * 測試餘額不足錯誤
   * GET /_debug/errors/insufficient-balance
   */
  @Get("insufficient-balance")
  testInsufficientBalanceError() {
    throw new InsufficientBalanceException(1000, 500);
  }

  /**
   * 測試訂閱錯誤
   * GET /_debug/errors/subscription
   */
  @Get("subscription")
  testSubscriptionError() {
    throw new SubscriptionException("Subscription has expired", {
      userId: "12345",
      expiresAt: "2026-01-01",
    });
  }

  /**
   * 測試標準 NestJS HttpException
   * GET /_debug/errors/http-exception
   */
  @Get("http-exception")
  testHttpException() {
    throw new HttpException("Custom HTTP exception", HttpStatus.BAD_REQUEST);
  }

  /**
   * 測試未處理的錯誤（拋出普通 Error）
   * GET /_debug/errors/unhandled
   */
  @Get("unhandled")
  testUnhandledError() {
    throw new Error("This is an unhandled error for testing purposes");
  }

  /**
   * 測試異步錯誤
   * GET /_debug/errors/async
   */
  @Get("async")
  async testAsyncError() {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error("Async error after 100ms delay");
  }

  /**
   * 測試 Promise rejection
   * GET /_debug/errors/promise-rejection
   */
  @Get("promise-rejection")
  async testPromiseRejection() {
    return Promise.reject(new ValidationException("Promise was rejected"));
  }

  /**
   * 測試成功響應（用於對比）
   * GET /_debug/errors/success
   */
  @Get("success")
  testSuccess() {
    return {
      message: "Success! This is a normal successful response.",
      data: {
        correlationId: "will-be-added-by-interceptor",
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 獲取所有錯誤類型列表
   * GET /_debug/errors
   */
  @Get()
  getErrorTypes() {
    return {
      message: "Error Testing Endpoints",
      endpoints: [
        {
          path: "/_debug/errors/validation",
          description: "Test ValidationException",
          errorCode: "ERR_2001",
          statusCode: 400,
        },
        {
          path: "/_debug/errors/not-found",
          description: "Test NotFoundException",
          errorCode: "ERR_3001",
          statusCode: 404,
        },
        {
          path: "/_debug/errors/conflict",
          description: "Test ConflictException",
          errorCode: "ERR_3003",
          statusCode: 409,
        },
        {
          path: "/_debug/errors/unauthorized",
          description: "Test UnauthorizedException",
          errorCode: "ERR_1001",
          statusCode: 401,
        },
        {
          path: "/_debug/errors/forbidden",
          description: "Test ForbiddenException",
          errorCode: "ERR_1004",
          statusCode: 403,
        },
        {
          path: "/_debug/errors/payment",
          description: "Test PaymentException",
          errorCode: "ERR_4003",
          statusCode: 402,
        },
        {
          path: "/_debug/errors/insufficient-balance",
          description: "Test InsufficientBalanceException",
          errorCode: "ERR_4002",
          statusCode: 402,
        },
        {
          path: "/_debug/errors/subscription",
          description: "Test SubscriptionException",
          errorCode: "ERR_4004",
          statusCode: 403,
        },
        {
          path: "/_debug/errors/http-exception",
          description: "Test standard NestJS HttpException",
          errorCode: "ERR_2001",
          statusCode: 400,
        },
        {
          path: "/_debug/errors/unhandled",
          description: "Test unhandled Error",
          errorCode: "ERR_5001",
          statusCode: 500,
        },
        {
          path: "/_debug/errors/async",
          description: "Test async error",
          errorCode: "ERR_5001",
          statusCode: 500,
        },
        {
          path: "/_debug/errors/promise-rejection",
          description: "Test Promise rejection",
          errorCode: "ERR_2001",
          statusCode: 400,
        },
        {
          path: "/_debug/errors/success",
          description: "Test successful response (for comparison)",
          errorCode: null,
          statusCode: 200,
        },
      ],
    };
  }
}
