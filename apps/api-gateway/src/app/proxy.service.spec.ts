import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ProxyService } from "./proxy.service";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("ProxyService", () => {
  let service: ProxyService;
  let _configService: ConfigService;
  let mockAxiosInstance: { request: jest.Mock };

  beforeEach(async () => {
    // Clear mocks first
    jest.clearAllMocks();
    
    // Setup mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => defaultValue),
          },
        },
      ],
    }).compile();

    service = module.get<ProxyService>(ProxyService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  describe("getTarget", () => {
    it("should return correct target for /api/auth path", () => {
      const target = service.getTarget("/api/auth/login");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/auth");
    });

    it("should return correct target for /api/posts path", () => {
      const target = service.getTarget("/api/posts/123");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/posts");
    });

    it("should return correct target for /api/users path", () => {
      const target = service.getTarget("/api/users/profile");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/users");
    });

    it("should return correct target for /api/subscriptions path", () => {
      const target = service.getTarget("/api/subscriptions");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/subscriptions");
    });

    it("should return null for unknown paths", () => {
      const target = service.getTarget("/api/unknown/route");
      expect(target).toBeNull();
    });

    it("should normalize paths without leading slash", () => {
      const target = service.getTarget("api/posts");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/posts");
    });

    it("should handle paths with trailing slashes", () => {
      const target = service.getTarget("/api/posts/");
      expect(target).toBeDefined();
    });

    it("should match longest prefix first", () => {
      const postPurchaseTarget = service.getTarget("/api/post-purchases/123");
      const postsTarget = service.getTarget("/api/posts/123");

      expect(postPurchaseTarget?.prefix).toBe("/api/post-purchases");
      expect(postsTarget?.prefix).toBe("/api/posts");
      expect(postPurchaseTarget?.prefix.length).toBeGreaterThan(
        postsTarget?.prefix.length || 0,
      );
    });

    it("should handle /api/admin routes", () => {
      const target = service.getTarget("/api/admin/dashboard");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/admin");
    });

    it("should match /api/subscription-tiers before /api/subscriptions", () => {
      const tierTarget = service.getTarget("/api/subscription-tiers/1");
      const subTarget = service.getTarget("/api/subscriptions/1");

      expect(tierTarget?.prefix).toBe("/api/subscription-tiers");
      expect(subTarget?.prefix).toBe("/api/subscriptions");
    });

    it("should return null for null path", () => {
      const target = service.getTarget(null as any);
      expect(target).toBeNull();
    });

    it("should return null for undefined path", () => {
      const target = service.getTarget(undefined as any);
      expect(target).toBeNull();
    });

    it("should return null for empty string path", () => {
      const target = service.getTarget("");
      expect(target).toBeNull();
    });

    it("should handle paths with query parameters", () => {
      const target = service.getTarget("/api/posts?id=123");
      expect(target).toBeDefined();
      expect(target?.prefix).toBe("/api/posts");
    });

    it("should handle paths with special characters", () => {
      const target = service.getTarget("/api/posts/test-post_123");
      expect(target).toBeDefined();
    });

    it("should handle unicode characters in path", () => {
      const target = service.getTarget("/api/posts/測試");
      expect(target).toBeDefined();
    });
  });

  describe("forward", () => {
    it("should return 404 for unknown routes", async () => {
      const result = await service.forward(
        "GET",
        "/api/unknown",
        "",
        {},
        undefined,
      );
      expect(result.status).toBe(404);
      expect((result.data as any).message).toBe("Not Found");
    });

    it("should forward GET requests", async () => {
      const mockResponse = {
        status: 200,
        data: { posts: [] },
        headers: { "content-type": "application/json" },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result.status).toBe(200);
      expect(result.data).toEqual({ posts: [] });
    });

    it("should forward POST requests with body", async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1, title: "New Post" },
        headers: { "content-type": "application/json" },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const body = { title: "New Post" };
      const result = await service.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        body,
      );

      expect(result.status).toBe(201);
      expect((result.data as any).title).toBe("New Post");
    });

    it("should forward PUT requests", async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, title: "Updated" },
        headers: { "content-type": "application/json" },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward(
        "PUT",
        "/api/posts/1",
        "",
        { "content-type": "application/json" },
        { title: "Updated" },
      );

      expect(result.status).toBe(200);
    });

    it("should forward DELETE requests", async () => {
      const mockResponse = {
        status: 204,
        data: null,
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward(
        "DELETE",
        "/api/posts/1",
        "",
        {},
        undefined,
      );
      expect(result.status).toBe(204);
    });

    it("should forward PATCH requests", async () => {
      const mockResponse = {
        status: 200,
        data: { id: 1, views: 100 },
        headers: { "content-type": "application/json" },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward(
        "PATCH",
        "/api/posts/1",
        "",
        { "content-type": "application/json" },
        { views: 100 },
      );

      expect(result.status).toBe(200);
    });

    it("should forward authorization headers", async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {},
        headers: {},
      });

      const headers = { authorization: "Bearer token123" };
      await service.forward("GET", "/api/posts", "", headers, undefined);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer token123",
          }),
        }),
      );
    });

    it("should forward content-type headers", async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {},
        headers: {},
      });

      const headers = { "content-type": "application/json" };
      await service.forward("POST", "/api/posts", "", headers, {});

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "content-type": "application/json",
          }),
        }),
      );
    });

    it("should handle query parameters", async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {},
        headers: {},
      });

      await service.forward(
        "GET",
        "/api/posts",
        "limit=10&offset=0",
        {},
        undefined,
      );

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("limit=10&offset=0"),
        }),
      );
    });

    it("should handle connection errors with 502", async () => {
      mockAxiosInstance.request.mockRejectedValueOnce(
        new Error("Connection refused"),
      );

      const result = await service.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result.status).toBe(502);
      expect((result.data as any).message).toBe("Bad Gateway");
    });

    it("should handle timeout errors with 504", async () => {
      const error = new Error("timeout");
      (error as any).code = "ECONNABORTED";

      mockAxiosInstance.request.mockRejectedValueOnce(error);

      const result = await service.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result.status).toBe(504);
      expect((result.data as any).message).toBe("Gateway Timeout");
    });

    it("should forward response content-type header", async () => {
      const mockResponse = {
        status: 200,
        data: { posts: [] },
        headers: { "content-type": "application/json" },
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result.headers["content-type"]).toBe("application/json");
    });

    it("should handle large request bodies", async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1 },
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const largeBody = { content: "x".repeat(100000) };
      const result = await service.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        largeBody,
      );

      expect(result.status).toBe(201);
    });

    it("should handle nested request bodies", async () => {
      const mockResponse = {
        status: 201,
        data: { id: 1 },
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const complexBody = {
        user: { name: "John", profile: { age: 30 } },
        items: [{ id: 1 }, { id: 2 }],
      };

      const result = await service.forward(
        "POST",
        "/api/posts",
        "",
        { "content-type": "application/json" },
        complexBody,
      );

      expect(result.status).toBe(201);
    });

    it("should handle null body", async () => {
      const mockResponse = {
        status: 200,
        data: {},
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward("GET", "/api/posts", "", {}, null);
      expect(result.status).toBe(200);
    });

    it("should handle empty headers", async () => {
      const mockResponse = {
        status: 200,
        data: {},
        headers: {},
      };

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

      const result = await service.forward(
        "GET",
        "/api/posts",
        "",
        {},
        undefined,
      );
      expect(result.status).toBe(200);
    });

    it("should construct correct URL with baseUrl and path", async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {},
        headers: {},
      });

      await service.forward("GET", "/api/posts/123", "", {}, undefined);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/api/posts/123"),
        }),
      );
    });

    it("should lowercase HTTP method", async () => {
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {},
        headers: {},
      });

      await service.forward("get", "/api/posts", "", {}, undefined);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("should handle various HTTP status codes", async () => {
      const testCases = [200, 201, 400, 401, 403, 404, 500];

      for (const statusCode of testCases) {
        mockAxiosInstance.request.mockResolvedValueOnce({
          status: statusCode,
          data: { status: statusCode },
          headers: {},
        });

        const result = await service.forward(
          "GET",
          "/api/posts",
          "",
          {},
          undefined,
        );
        expect(result.status).toBe(statusCode);
      }
    });
  });

  describe("target configuration", () => {
    it("should have all required service targets", () => {
      const requiredPrefixes = [
        "/api/auth",
        "/api/users",
        "/api/matching",
        "/api/posts",
        "/api/subscriptions",
        "/api/upload",
        "/api/admin",
      ];

      requiredPrefixes.forEach((prefix) => {
        const target = service.getTarget(prefix + "/test");
        expect(target?.prefix).toBe(prefix);
      });
    });

    it("should have valid base URLs for all targets", () => {
      const prefixes = [
        "/api/auth",
        "/api/users",
        "/api/matching",
        "/api/posts",
        "/api/subscriptions",
        "/api/upload",
        "/api/admin",
      ];

      prefixes.forEach((prefix) => {
        const target = service.getTarget(prefix + "/test");
        expect(target?.baseUrl).toMatch(/^http:\/\/localhost:\d+$/);
      });
    });
  });
});
