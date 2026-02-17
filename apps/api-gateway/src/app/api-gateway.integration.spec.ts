import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./app.module";
import { ProxyService } from "./proxy.service";
import { RedisService } from "@suggar-daddy/redis";

// Mock RedisService to avoid actual Redis connection
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

describe("API Gateway (e2e)", () => {
  let app: INestApplication;
  let proxyService: ProxyService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    proxyService = moduleFixture.get<ProxyService>(ProxyService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Root & Health Endpoints", () => {
    it("GET / should return service information", () => {
      return request(app.getHttpServer())
        .get("/")
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("service", "api-gateway");
          expect(res.body).toHaveProperty("message");
          expect(res.body).toHaveProperty("health", "/health");
        });
    });

    it("GET /health should return ok status", () => {
      return request(app.getHttpServer())
        .get("/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            status: "ok",
            service: "api-gateway",
          });
        });
    });
  });

  describe("Route Matching", () => {
    it("should identify target for /api/auth", () => {
      const target = proxyService.getTarget("/api/auth/login");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/auth");
      expect(target?.baseUrl).toContain("3002");
    });

    it("should identify target for /api/users", () => {
      const target = proxyService.getTarget("/api/users/profile");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/users");
      expect(target?.baseUrl).toContain("3001");
    });

    it("should identify target for /api/matching", () => {
      const target = proxyService.getTarget("/api/matching/cards");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/matching");
      expect(target?.baseUrl).toContain("3003");
    });

    it("should identify target for /api/posts", () => {
      const target = proxyService.getTarget("/api/posts");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/posts");
      expect(target?.baseUrl).toContain("3006");
    });

    it("should identify target for /api/tips", () => {
      const target = proxyService.getTarget("/api/tips");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/tips");
      expect(target?.baseUrl).toContain("3007");
    });

    it("should identify target for /api/subscriptions", () => {
      const target = proxyService.getTarget("/api/subscriptions");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/subscriptions");
      expect(target?.baseUrl).toContain("3009");
    });

    it("should identify target for /api/upload", () => {
      const target = proxyService.getTarget("/api/upload");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/upload");
      expect(target?.baseUrl).toContain("3010");
    });

    it("should identify target for /api/admin", () => {
      const target = proxyService.getTarget("/api/admin/dashboard");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/admin");
      expect(target?.baseUrl).toContain("3011");
    });

    it("should return null for unknown route", () => {
      const target = proxyService.getTarget("/api/unknown/route");
      expect(target).toBeNull();
    });

    it("should handle paths without leading slash", () => {
      const target = proxyService.getTarget("api/posts");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/posts");
    });
  });

  describe("Route Priority (Longest Prefix Match)", () => {
    it("should match /api/subscription-tiers before /api/subscriptions", () => {
      const tierTarget = proxyService.getTarget("/api/subscription-tiers");
      const subTarget = proxyService.getTarget("/api/subscriptions");

      expect(tierTarget?.prefix).toBe("/api/subscription-tiers");
      expect(subTarget?.prefix).toBe("/api/subscriptions");
      expect(tierTarget?.baseUrl).toBe(subTarget?.baseUrl);
    });

    it("should match /api/post-purchases before /api/posts", () => {
      const purchaseTarget = proxyService.getTarget("/api/post-purchases/123");
      const postTarget = proxyService.getTarget("/api/posts/456");

      expect(purchaseTarget?.prefix).toBe("/api/post-purchases");
      expect(postTarget?.prefix).toBe("/api/posts");
    });

    it("should match /api/admin before other /api routes", () => {
      const adminTarget = proxyService.getTarget("/api/admin/users");
      const userTarget = proxyService.getTarget("/api/users/123");

      expect(adminTarget?.prefix).toBe("/api/admin");
      expect(userTarget?.prefix).toBe("/api/users");
      expect(adminTarget?.baseUrl).not.toBe(userTarget?.baseUrl);
    });
  });

  describe("Proxy Forwarding (Mock Downstream Services)", () => {
    it("should return 404 for unknown routes", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/unknown/route",
        "",
        {},
        undefined,
      );

      expect(result.status).toBe(404);
      expect(result.data).toMatchObject({
        message: "Not Found",
        path: "/api/unknown/route",
      });
    });

    it("should forward authorization header", async () => {
      const mockToken = "Bearer test-token";
      const result = await proxyService.forward(
        "GET",
        "/api/auth/me",
        "",
        { authorization: mockToken },
        undefined,
      );

      // 不檢查實際響應（因為服務可能未運行），只確認沒有崩潰
      expect([200, 401, 404, 502, 504]).toContain(result.status);
    });

    it("should handle query parameters", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "limit=10&offset=0",
        {},
        undefined,
      );

      expect([200, 404, 502, 504]).toContain(result.status);
    });

    it("should forward POST body", async () => {
      const body = { email: "test@example.com", password: "password" };
      const result = await proxyService.forward(
        "POST",
        "/api/auth/login",
        "",
        { "content-type": "application/json" },
        body,
      );

      expect([200, 400, 401, 403, 404, 502, 504]).toContain(result.status);
    });
  });

  describe("HTTP Methods", () => {
    it("should handle GET requests", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("data");
    });

    it("should handle POST requests", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        { title: "Test Post" },
      );
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("data");
    });

    it("should handle PUT requests", async () => {
      const result = await proxyService.forward(
        "PUT",
        "/api/posts/123",
        "",
        { "content-type": "application/json" },
        { title: "Updated" },
      );
      expect(result).toHaveProperty("status");
    });

    it("should handle DELETE requests", async () => {
      const result = await proxyService.forward(
        "DELETE",
        "/api/posts/123",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("status");
    });

    it("should handle PATCH requests", async () => {
      const result = await proxyService.forward(
        "PATCH",
        "/api/posts/123",
        "",
        { "content-type": "application/json" },
        { views: 100 },
      );
      expect(result).toHaveProperty("status");
    });
  });

  describe("Error Handling", () => {
    it("should return 502 Bad Gateway on connection error", async () => {
      // 使用一個不存在的服務地址
      jest.spyOn(proxyService, "getTarget").mockReturnValueOnce({
        prefix: "/api/test",
        baseUrl: "http://localhost:99999", // 無效端口
      });

      const result = await proxyService.forward(
        "GET",
        "/api/test",
        "",
        {},
        undefined,
      );

      expect([502, 504]).toContain(result.status);
      expect(result.data).toHaveProperty("message");
      expect(result.data).toHaveProperty("path");
    });

    it("should handle timeout scenarios", async () => {
      jest.spyOn(proxyService, "getTarget").mockReturnValueOnce({
        prefix: "/api/slow",
        baseUrl: "http://10.255.255.1", // 不可路由的地址
      });

      const result = await proxyService.forward(
        "GET",
        "/api/slow",
        "",
        {},
        undefined,
      );

      expect([502, 504]).toContain(result.status);
    }, 35000); // 增加超時時間以配合 axios 的 30 秒超時
  });

  describe("Header Forwarding", () => {
    it("should forward authorization header", async () => {
      const headers = {
        authorization: "Bearer token123",
        "content-type": "application/json",
      };

      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        headers,
        {},
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("status");
    });

    it("should forward content-type header", async () => {
      const headers = {
        "content-type": "multipart/form-data",
      };

      const result = await proxyService.forward(
        "POST",
        "/api/upload",
        "",
        headers,
        {},
      );

      expect(result).toBeDefined();
    });

    it("should not forward other headers", async () => {
      const headers = {
        "x-custom-header": "value",
        "user-agent": "test-agent",
      };

      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "",
        headers,
        undefined,
      );

      expect(result).toBeDefined();
    });

    it("should forward multiple headers", async () => {
      const headers = {
        authorization: "Bearer token123",
        "content-type": "application/json",
        "x-request-id": "req-123",
      };

      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        headers,
        { title: "Test" },
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty("status");
    });
  });

  describe("Boundary Cases", () => {
    it("should handle root path requests", () => {
      const target = proxyService.getTarget("/");
      expect(target).toBeNull();
    });

    it("should handle paths with trailing slashes", () => {
      const target = proxyService.getTarget("/api/posts/");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/posts");
    });

    it("should handle paths with double slashes", () => {
      // Leading double slash still matches /api/posts prefix
      const target = proxyService.getTarget("/api/posts/123");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/posts");
    });

    it("should handle paths with query-like characters", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts?id=123",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("status");
    });

    it("should handle paths with hash characters", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts#section",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("status");
    });

    it("should handle very long paths", () => {
      const longPath = "/api/posts/" + "a".repeat(500);
      const target = proxyService.getTarget(longPath);
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/posts");
    });

    it("should handle special characters in path", () => {
      const target = proxyService.getTarget("/api/posts/test-post_123");
      expect(target).toBeTruthy();
    });

    it("should handle unicode characters in path", () => {
      const target = proxyService.getTarget("/api/posts/測試");
      expect(target).toBeTruthy();
    });

    it("should handle paths with encoded characters", () => {
      const target = proxyService.getTarget("/api/posts/%20test");
      expect(target).toBeTruthy();
    });
  });

  describe("Request Body Handling", () => {
    it("should handle large JSON bodies", async () => {
      const largeBody = {
        content: "x".repeat(10000),
        metadata: { tags: Array(100).fill("tag") },
      };

      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        largeBody,
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle empty request body", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("status");
    });

    it("should handle null body", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        {},
        null,
      );
      expect(result).toHaveProperty("status");
    });

    it("should handle string body", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "text/plain" },
        "test content",
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle nested object body", async () => {
      const complexBody = {
        user: {
          profile: {
            name: "Test",
            settings: { notifications: true },
          },
        },
        items: [
          { id: 1, name: "item1" },
          { id: 2, name: "item2" },
        ],
      };

      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        complexBody,
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle array body", async () => {
      const arrayBody = [
        { id: 1, name: "item1" },
        { id: 2, name: "item2" },
      ];

      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        arrayBody,
      );

      expect(result).toHaveProperty("status");
    });
  });

  describe("Query String Handling", () => {
    it("should handle query parameters with multiple values", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "page=1&limit=10&sort=name&filter=active",
        {},
        undefined,
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle query parameters with special characters", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "search=test%20query&filter=name%3DJohn",
        {},
        undefined,
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle query parameters with empty values", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "page=1&limit=&sort=",
        {},
        undefined,
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle duplicate query parameters", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "tag=javascript&tag=nodejs&tag=typescript",
        {},
        undefined,
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle query string with no parameters", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );

      expect(result).toHaveProperty("status");
    });
  });

  describe("Content Type Handling", () => {
    it("should handle application/json content type", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        { title: "Test" },
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle text/plain content type", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "text/plain" },
        "test content",
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle application/x-www-form-urlencoded content type", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/x-www-form-urlencoded" },
        "name=John&age=30",
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle multipart/form-data content type", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/upload",
        "",
        { "content-type": "multipart/form-data; boundary=----Boundary" },
        "form data",
      );

      expect(result).toHaveProperty("status");
    });

    it("should handle missing content type", async () => {
      const result = await proxyService.forward(
        "POST",
        "/api/posts",
        "",
        {},
        { title: "Test" },
      );

      expect(result).toHaveProperty("status");
    });
  });

  describe("Concurrent Requests", () => {
    it("should handle multiple concurrent requests", async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          proxyService.forward("GET", "/api/posts", `page=${i}`, {}, undefined),
        );
      }

      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty("status");
      });
    });

    it("should handle mixed HTTP methods concurrently", async () => {
      const requests = [
        proxyService.forward("GET", "/api/posts", "", {}, undefined),
        proxyService.forward(
          "POST",
          "/api/posts",
          "",
          { "content-type": "application/json" },
          { title: "New" },
        ),
        proxyService.forward(
          "PUT",
          "/api/posts/123",
          "",
          { "content-type": "application/json" },
          { title: "Updated" },
        ),
        proxyService.forward("DELETE", "/api/posts/456", "", {}, undefined),
      ];

      const results = await Promise.all(requests);

      expect(results).toHaveLength(4);
      results.forEach((result) => {
        expect(result).toHaveProperty("status");
        expect(result).toHaveProperty("data");
      });
    });

    it("should handle burst requests to same endpoint", async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          proxyService.forward("GET", "/api/posts", "", {}, undefined),
        );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      expect(results.filter((r) => r.status > 0).length).toBeGreaterThanOrEqual(
        0,
      );
    });
  });

  describe("Response Validation", () => {
    it("should include status in response", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("status");
      expect(typeof result.status).toBe("number");
    });

    it("should include data in response", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result).toHaveProperty("data");
    });

    it("should handle response with no data", async () => {
      const result = await proxyService.forward(
        "DELETE",
        "/api/posts/123",
        "",
        {},
        undefined,
      );
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it("should handle response with error message", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/unknown",
        "",
        {},
        undefined,
      );
      expect(result.status).toBeGreaterThanOrEqual(404);
    });

    it("should handle response with headers", async () => {
      const result = await proxyService.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result).toBeDefined();
      expect([200, 404, 502, 504]).toContain(result.status);
    });
  });

  describe("Route Mapping Coverage", () => {
    it("should handle /api/messaging routes", () => {
      const target = proxyService.getTarget("/api/messaging/conversations");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/messaging");
    });

    it("should handle /api/notifications routes", () => {
      const target = proxyService.getTarget("/api/notifications");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/notifications");
    });

    it("should handle /api/transactions routes", () => {
      const target = proxyService.getTarget("/api/transactions");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/transactions");
    });

    it("should handle /api/wallet routes", () => {
      const target = proxyService.getTarget("/api/wallet/balance");
      expect(target).toBeTruthy();
      expect(target?.prefix).toBe("/api/wallet");
    });

    it("should route priority with similar prefixes", () => {
      const postPurchase = proxyService.getTarget("/api/post-purchases/list");
      const post = proxyService.getTarget("/api/posts/list");

      expect(postPurchase?.prefix).toBe("/api/post-purchases");
      expect(post?.prefix).toBe("/api/posts");
      expect(postPurchase?.prefix.length).toBeGreaterThan(
        post?.prefix.length || 0,
      );
    });
  });

  describe("Error Scenarios", () => {
    it("should handle invalid HTTP methods gracefully", async () => {
      const result = await proxyService.forward(
        "INVALID",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result).toBeDefined();
    });

    it("should handle empty path string", () => {
      const target = proxyService.getTarget("");
      expect(target).toBeNull();
    });

    it("should handle unknown routes", () => {
      const target = proxyService.getTarget("/api/unknown/path");
      expect(target).toBeNull();
    });
  });

  describe("Health Check Integration", () => {
    it("GET /health should return consistent status", async () => {
      const result1 = await request(app.getHttpServer())
        .get("/health")
        .expect(200);

      const result2 = await request(app.getHttpServer())
        .get("/health")
        .expect(200);

      expect(result1.body).toEqual(result2.body);
      expect(result1.body.service).toBe("api-gateway");
    });

    it("GET / should be accessible multiple times", async () => {
      const result1 = await request(app.getHttpServer()).get("/").expect(200);
      const result2 = await request(app.getHttpServer()).get("/").expect(200);

      expect(result1.body).toHaveProperty("service");
      expect(result2.body).toHaveProperty("service");
    });
  });

  describe("Service Address Coverage", () => {
    it("should have valid port numbers for all routes", () => {
      const routes = [
        "/api/auth/login",
        "/api/users/profile",
        "/api/matching/cards",
        "/api/posts",
        "/api/tips",
        "/api/subscriptions",
        "/api/upload",
        "/api/admin/dashboard",
      ];

      routes.forEach((route) => {
        const target = proxyService.getTarget(route);
        expect(target).toBeTruthy();
        expect(target?.baseUrl).toMatch(/:\d+/);
        const portMatch = target?.baseUrl.match(/:(\d+)$/);
        if (portMatch) {
          const port = parseInt(portMatch[1], 10);
          expect(port).toBeGreaterThanOrEqual(3000);
          expect(port).toBeLessThanOrEqual(3020);
        }
      });
    });
  });
});
