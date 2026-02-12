import { RequestLoggerMiddleware } from "./request-logger.middleware";
import { Logger } from "@nestjs/common";

describe("RequestLoggerMiddleware", () => {
  let middleware: RequestLoggerMiddleware;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let loggerSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new RequestLoggerMiddleware();
    mockNext = jest.fn();

    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe("middleware basic functionality", () => {
    it("should call next function", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      const finishListeners: any[] = [];
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListeners.push(listener);
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should log request on response finish", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);

      // Simulate response finish
      finishListener();

      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe("HTTP method logging", () => {
    const testMethods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
    ];

    testMethods.forEach((method) => {
      it(`should log ${method} requests`, () => {
        mockRequest = {
          method,
          originalUrl: "/api/posts",
          ip: "127.0.0.1",
        };

        let finishListener: any;
        mockResponse = {
          on: jest.fn((event, listener) => {
            if (event === "finish") finishListener = listener;
            return mockResponse;
          }),
          statusCode: 200,
        };

        middleware.use(mockRequest, mockResponse, mockNext);
        finishListener();

        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(method));
      });
    });
  });

  describe("URL logging", () => {
    it("should log request URL", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts/123",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/posts/123"),
      );
    });

    it("should log URL with query parameters", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts?page=1&limit=10",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("?page=1&limit=10"),
      );
    });
  });

  describe("Status code logging", () => {
    it("should log 2xx status codes with info level", () => {
      const statusCodes = [200, 201, 204];

      statusCodes.forEach((statusCode) => {
        jest.clearAllMocks();
        loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();

        mockRequest = {
          method: "GET",
          originalUrl: "/api/posts",
          ip: "127.0.0.1",
        };

        let finishListener: any;
        mockResponse = {
          on: jest.fn((event, listener) => {
            if (event === "finish") finishListener = listener;
            return mockResponse;
          }),
          statusCode,
        };

        middleware.use(mockRequest, mockResponse, mockNext);
        finishListener();

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${statusCode}`),
        );
      });
    });

    it("should log 4xx status codes with warn level", () => {
      const statusCodes = [400, 401, 403, 404];
      warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

      statusCodes.forEach((statusCode) => {
        jest.clearAllMocks();
        warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

        mockRequest = {
          method: "GET",
          originalUrl: "/api/posts",
          ip: "127.0.0.1",
        };

        let finishListener: any;
        mockResponse = {
          on: jest.fn((event, listener) => {
            if (event === "finish") finishListener = listener;
            return mockResponse;
          }),
          statusCode,
        };

        middleware.use(mockRequest, mockResponse, mockNext);
        finishListener();

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${statusCode}`),
        );
      });
    });

    it("should log 5xx status codes with error level", () => {
      const statusCodes = [500, 502, 503, 504];
      errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();

      statusCodes.forEach((statusCode) => {
        jest.clearAllMocks();
        errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();

        mockRequest = {
          method: "GET",
          originalUrl: "/api/posts",
          ip: "127.0.0.1",
        };

        let finishListener: any;
        mockResponse = {
          on: jest.fn((event, listener) => {
            if (event === "finish") finishListener = listener;
            return mockResponse;
          }),
          statusCode,
        };

        middleware.use(mockRequest, mockResponse, mockNext);
        finishListener();

        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining(`${statusCode}`),
        );
      });
    });
  });

  describe("Response time measurement", () => {
    it("should measure and log response duration", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      jest.useFakeTimers();
      middleware.use(mockRequest, mockResponse, mockNext);
      jest.advanceTimersByTime(150);
      finishListener();
      jest.useRealTimers();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("ms"));
    });

    it("should handle instant responses", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("ms"));
    });

    it("should handle long-running requests", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      jest.useFakeTimers();
      middleware.use(mockRequest, mockResponse, mockNext);
      jest.advanceTimersByTime(5000);
      finishListener();
      jest.useRealTimers();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("5000ms"));
    });
  });

  describe("IP address logging", () => {
    it("should log request IP address", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "192.168.1.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("192.168.1.1"),
      );
    });

    it("should handle different IP addresses", () => {
      const ips = ["127.0.0.1", "192.168.1.1", "10.0.0.1", "::1"];

      ips.forEach((ip) => {
        jest.clearAllMocks();
        loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();

        mockRequest = {
          method: "GET",
          originalUrl: "/api/posts",
          ip,
        };

        let finishListener: any;
        mockResponse = {
          on: jest.fn((event, listener) => {
            if (event === "finish") finishListener = listener;
            return mockResponse;
          }),
          statusCode: 200,
        };

        middleware.use(mockRequest, mockResponse, mockNext);
        finishListener();

        expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining(ip));
      });
    });
  });

  describe("Log message format", () => {
    it("should include all required parts in log message", () => {
      mockRequest = {
        method: "POST",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 201,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      const callArgs = loggerSpy.mock.calls[0][0];
      expect(callArgs).toContain("POST");
      expect(callArgs).toContain("/api/posts");
      expect(callArgs).toContain("201");
      expect(callArgs).toContain("127.0.0.1");
    });
  });

  describe("Multiple requests", () => {
    it("should log multiple requests independently", () => {
      // First request
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener1: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener1 = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener1();

      // Second request
      mockRequest = {
        method: "POST",
        originalUrl: "/api/posts",
        ip: "192.168.1.1",
      };

      let finishListener2: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener2 = listener;
          return mockResponse;
        }),
        statusCode: 201,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener2();

      expect(loggerSpy).toHaveBeenCalledTimes(2);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing IP address", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "/api/posts",
        ip: undefined,
        socket: { remoteAddress: "127.0.0.1" },
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should handle empty originalUrl", () => {
      mockRequest = {
        method: "GET",
        originalUrl: "",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should handle empty method", () => {
      mockRequest = {
        method: "",
        originalUrl: "/api/posts",
        ip: "127.0.0.1",
      };

      let finishListener: any;
      mockResponse = {
        on: jest.fn((event, listener) => {
          if (event === "finish") finishListener = listener;
          return mockResponse;
        }),
        statusCode: 200,
      };

      middleware.use(mockRequest, mockResponse, mockNext);
      finishListener();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should handle unusual status codes", () => {
      const statusCodes = [418, 451, 599];

      statusCodes.forEach((statusCode) => {
        jest.clearAllMocks();

        if (statusCode >= 500) {
          errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
        } else if (statusCode >= 400) {
          warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
        } else {
          loggerSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
        }

        mockRequest = {
          method: "GET",
          originalUrl: "/api/posts",
          ip: "127.0.0.1",
        };

        let finishListener: any;
        mockResponse = {
          on: jest.fn((event, listener) => {
            if (event === "finish") finishListener = listener;
            return mockResponse;
          }),
          statusCode,
        };

        middleware.use(mockRequest, mockResponse, mockNext);
        finishListener();
      });
    });
  });
});
