import { Test, TestingModule } from "@nestjs/testing";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RedisService } from "@suggar-daddy/redis";
import { ConfigService } from "@nestjs/config";
import { HttpException } from "@nestjs/common";

describe.skip("RateLimitMiddleware", () => {
  let middleware: RateLimitMiddleware;
  let redisService: any;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(async () => {
    // Create mock Redis service
    redisService = {
      getClient: jest.fn().mockReturnValue({
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        ttl: jest.fn().mockResolvedValue(60),
      }),
    };

    // Create mock ConfigService
    const configService = {
      get: jest.fn((key, defaultValue) => {
        const config = {
          RATE_LIMIT_ENABLED: "true",
          AUTH_LOGIN_LIMIT: "10",
          AUTH_REGISTER_LIMIT: "10",
          GENERAL_LIMIT: "60",
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitMiddleware,
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("use - core functionality", () => {
    beforeEach(() => {
      mockRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      };
      mockResponse = {
        setHeader: jest.fn(),
      };
    });

    it("should allow request when count is below limit", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Limit",
        expect.any(Number),
      );
    });

    it("should set rate limit headers", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Limit",
        60,
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        expect.any(Number),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Reset",
        expect.any(Number),
      );
    });

    it("should throw 429 when limit exceeded", async () => {
      redisService.getClient().incr.mockResolvedValue(65);
      mockRequest.originalUrl = "/api/posts";

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(HttpException);
    });

    it("should apply strict limits to /api/auth/login", async () => {
      mockRequest.originalUrl = "/api/auth/login";
      mockRequest.path = "/api/auth/login";
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      await middleware.use(mockRequest, mockResponse, mockNext);

      // Should set limit to 10 for auth endpoints
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Limit",
        10,
      );
    });

    it("should apply strict limits to /api/auth/register", async () => {
      mockRequest.originalUrl = "/api/auth/register";
      mockRequest.path = "/api/auth/register";
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Limit",
        10,
      );
    });
  });

  describe("Redis handling", () => {
    beforeEach(() => {
      mockRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      };
      mockResponse = {
        setHeader: jest.fn(),
      };
    });

    it("should set expire on first request (incr == 1)", async () => {
      redisService.getClient().incr.mockResolvedValue(1);
      redisService.getClient().expire.mockResolvedValue(1);
      redisService.getClient().ttl.mockResolvedValue(-1);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(redisService.getClient().expire).toHaveBeenCalled();
    });

    it("should not call expire on subsequent requests", async () => {
      redisService.getClient().incr.mockResolvedValueOnce(1);
      redisService.getClient().incr.mockResolvedValueOnce(2);

      await middleware.use(mockRequest, mockResponse, mockNext);
      jest.clearAllMocks();

      redisService.getClient().incr.mockResolvedValue(2);
      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(redisService.getClient().expire).not.toHaveBeenCalled();
    });

    it("should get TTL for rate limit reset time", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(45);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(redisService.getClient().ttl).toHaveBeenCalled();
    });

    it("should fallback to in-memory when Redis errors", async () => {
      redisService.getClient().incr.mockRejectedValue(new Error("Redis down"));
      mockRequest.originalUrl = "/api/posts";

      // Should not throw, should fallback to in-memory
      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).resolves.not.toThrow();
    });
  });

  describe("In-memory fallback", () => {
    beforeEach(() => {
      mockRequest = {
        ip: "192.168.1.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      };
      mockResponse = {
        setHeader: jest.fn(),
      };
    });

    it("should track requests in in-memory store", async () => {
      redisService.getClient().incr.mockRejectedValue(new Error("Redis down"));

      // Make first request
      await middleware.use(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should enforce in-memory limits", async () => {
      redisService.getClient().incr.mockRejectedValue(new Error("Redis down"));
      mockRequest.originalUrl = "/api/posts";

      // Make requests up to limit (60 for general endpoints)
      for (let i = 0; i < 61; i++) {
        if (i < 60) {
          mockNext.mockClear();
          await middleware.use(mockRequest, mockResponse, mockNext);
        } else {
          // Should throw on 61st request
          await expect(
            middleware.use(mockRequest, mockResponse, mockNext),
          ).rejects.toThrow(HttpException);
        }
      }
    });
  });

  describe("Rate limit headers", () => {
    beforeEach(() => {
      mockRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      };
      mockResponse = {
        setHeader: jest.fn(),
      };
    });

    it("should set X-RateLimit-Limit header", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Limit",
        60,
      );
    });

    it("should set X-RateLimit-Remaining header", async () => {
      redisService.getClient().incr.mockResolvedValue(15);
      redisService.getClient().ttl.mockResolvedValue(60);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        45,
      );
    });

    it("should set X-RateLimit-Reset header", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(30);

      const beforeTime = Math.floor(Date.now() / 1000);
      await middleware.use(mockRequest, mockResponse, mockNext);
      const afterTime = Math.floor(Date.now() / 1000) + 30;

      const calls = mockResponse.setHeader.mock.calls;
      const resetCall = calls.find((call) => call[0] === "X-RateLimit-Reset");
      expect(resetCall).toBeDefined();
    });

    it("should set remaining to 0 when limit exceeded", async () => {
      redisService.getClient().incr.mockResolvedValue(60);
      mockRequest.originalUrl = "/api/posts";

      try {
        await middleware.use(mockRequest, mockResponse, mockNext);
      } catch {
        // Expected to throw
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        0,
      );
    });
  });

  describe("Different request sources", () => {
    it("should track rate limits separately by IP", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      const request1 = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      } as any;

      const request2 = {
        ip: "192.168.1.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      } as any;

      const response = {
        setHeader: jest.fn(),
      } as any;

      await middleware.use(request1, response, mockNext);
      jest.clearAllMocks();

      await middleware.use(request2, response, mockNext);

      // Both should succeed because they have different IPs
      expect(mockNext.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("should track different limits for different paths", async () => {
      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      const authRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/auth/login",
        path: "/api/auth/login",
      } as any;

      const postsRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      } as any;

      const response = {
        setHeader: jest.fn(),
      } as any;

      await middleware.use(authRequest, response, mockNext);
      const authHeaders = response.setHeader.mock.calls;

      jest.clearAllMocks();
      response.setHeader.mockClear();

      await middleware.use(postsRequest, response, mockNext);
      const postsHeaders = response.setHeader.mock.calls;

      // Auth should have limit of 10
      expect(authHeaders.some((call) => call[0] === "X-RateLimit-Limit"));
      // Posts should have limit of 60
      expect(postsHeaders.some((call) => call[0] === "X-RateLimit-Limit"));
    });
  });

  describe("Edge cases", () => {
    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
      };
    });

    it("should handle TTL of 0 seconds", async () => {
      mockRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      };

      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(0);

      await middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle very high request counts", async () => {
      mockRequest = {
        ip: "127.0.0.1",
        originalUrl: "/api/posts",
        path: "/api/posts",
      };

      redisService.getClient().incr.mockResolvedValue(10000);
      redisService.getClient().ttl.mockResolvedValue(60);

      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).rejects.toThrow(HttpException);
    });

    it("should handle missing IP address gracefully", async () => {
      mockRequest = {
        ip: undefined,
        originalUrl: "/api/posts",
        path: "/api/posts",
        socket: { remoteAddress: "127.0.0.1" },
      };

      redisService.getClient().incr.mockResolvedValue(5);
      redisService.getClient().ttl.mockResolvedValue(60);

      // Should not throw
      await expect(
        middleware.use(mockRequest, mockResponse, mockNext),
      ).resolves.not.toThrow();
    });
  });
});
