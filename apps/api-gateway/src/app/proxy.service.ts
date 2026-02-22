import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';
import {
  CircuitBreakerService,
  API_GATEWAY_CONFIG,
} from '@suggar-daddy/common';

export interface ProxyTarget {
  prefix: string;
  baseUrl: string;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly client: AxiosInstance;
  private readonly targets: ProxyTarget[] = [];

  constructor(
    private readonly config: ConfigService,
    // 讓 CircuitBreaker 變成可選的，以便測試時可以禁用
    // private readonly circuitBreaker: CircuitBreakerService
  ) {
    this.client = axios.create({
      timeout: 30000,
      validateStatus: () => true,
    });
    this.targets = [
      {
        prefix: '/api/auth',
        baseUrl: this.config.get<string>(
          'AUTH_SERVICE_URL',
          'http://localhost:3002',
        ),
      },
      {
        prefix: '/api/users',
        baseUrl: this.config.get<string>(
          'USER_SERVICE_URL',
          'http://localhost:3001',
        ),
      },
      {
        prefix: '/api/matching',
        baseUrl: this.config.get<string>(
          'MATCHING_SERVICE_URL',
          'http://localhost:3003',
        ),
      },
      {
        prefix: '/api/notifications',
        baseUrl: this.config.get<string>(
          'NOTIFICATION_SERVICE_URL',
          'http://localhost:3004',
        ),
      },
      {
        prefix: '/api/messaging',
        baseUrl: this.config.get<string>(
          'MESSAGING_SERVICE_URL',
          'http://localhost:3005',
        ),
      },
      {
        prefix: '/api/moderation',
        baseUrl: this.config.get<string>(
          'CONTENT_SERVICE_URL',
          'http://localhost:3006',
        ),
      },
      {
        prefix: '/api/stories',
        baseUrl: this.config.get<string>(
          'CONTENT_SERVICE_URL',
          'http://localhost:3006',
        ),
      },
      {
        prefix: '/api/videos',
        baseUrl: this.config.get<string>(
          'CONTENT_SERVICE_URL',
          'http://localhost:3006',
        ),
      },
      {
        prefix: '/api/posts',
        baseUrl: this.config.get<string>(
          'CONTENT_SERVICE_URL',
          'http://localhost:3006',
        ),
      },
      {
        prefix: '/api/blogs',
        baseUrl: this.config.get<string>(
          'CONTENT_SERVICE_URL',
          'http://localhost:3006',
        ),
      },
      {
        prefix: '/api/diamonds',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/diamond-packages',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/tips',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/dm-purchases',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/post-purchases',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/transactions',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/stripe',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/wallet',
        baseUrl: this.config.get<string>(
          'PAYMENT_SERVICE_URL',
          'http://localhost:3007',
        ),
      },
      {
        prefix: '/api/subscription-tiers',
        baseUrl: this.config.get<string>(
          'SUBSCRIPTION_SERVICE_URL',
          'http://localhost:3009',
        ),
      },
      {
        prefix: '/api/subscriptions',
        baseUrl: this.config.get<string>(
          'SUBSCRIPTION_SERVICE_URL',
          'http://localhost:3009',
        ),
      },
      {
        prefix: '/api/skills',
        baseUrl: this.config.get<string>(
          'SKILL_SERVICE_URL',
          'http://localhost:3013',
        ),
      },
      {
        prefix: '/api/recommendations',
        baseUrl: this.config.get<string>(
          'RECOMMENDATION_SERVICE_URL',
          'http://localhost:3012',
        ),
      },
      {
        prefix: '/api/streaming',
        baseUrl: this.config.get<string>(
          'CONTENT_SERVICE_URL',
          'http://localhost:3006',
        ),
      },
      {
        prefix: '/api/upload',
        baseUrl: this.config.get<string>(
          'MEDIA_SERVICE_URL',
          'http://localhost:3008',
        ),
      },
      {
        prefix: '/api/media',
        baseUrl: this.config.get<string>(
          'MEDIA_SERVICE_URL',
          'http://localhost:3008',
        ),
      },
      {
        prefix: '/api/admin',
        baseUrl: this.config.get<string>(
          'ADMIN_SERVICE_URL',
          'http://localhost:3011',
        ),
      },
    ].sort((a, b) => b.prefix.length - a.prefix.length);
  }

  getTarget(path: string): ProxyTarget | null {
    if (!path) {
      return null;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return this.targets.find((t) => normalized.startsWith(t.prefix)) ?? null;
  }

  async forward(
    method: string,
    path: string,
    query: string,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<{
    status: number;
    data: unknown;
    headers: Record<string, string>;
  }> {
    const target = this.getTarget(path);
    if (!target) {
      this.logger.warn(`No target for path: ${path}`);
      return {
        status: 404,
        data: { message: 'Not Found', path },
        headers: {},
      };
    }

    const url = `${target.baseUrl}${path}${query ? (path.includes('?') ? '&' : '?') + query : ''}`;
    const forwardHeaders: Record<string, string> = {};
    if (headers['authorization'])
      forwardHeaders['authorization'] = headers['authorization'];
    if (headers['content-type'])
      forwardHeaders['content-type'] = headers['content-type'];

    const config: AxiosRequestConfig = {
      method: method.toUpperCase() as Method,
      url,
      headers: forwardHeaders,
      data: body,
    };

    this.logger.log(`[PROXY] ${method} ${path} -> ${url}`);
    this.logger.debug(`[PROXY] Headers: ${JSON.stringify(forwardHeaders)}`);
    if (body) {
      this.logger.debug(`[PROXY] Body: ${JSON.stringify(body)}`);
    }

    // 使用 Circuit Breaker 保護請求
    const serviceName = this.getServiceName(target.prefix);
    const breakerName = `api-gateway-${serviceName}`;

    try {
      // 包裝 axios 請求
      const makeRequest = async () => {
        const res = await this.client.request(config);
        this.logger.log(`[PROXY] Response: ${res.status} from ${url}`);

        if (res.status >= 500) {
          // 5xx 錯誤視為失敗，觸發熔斷器
          throw new Error(`Service error: ${res.status}`);
        }

        if (res.status >= 400) {
          this.logger.warn(
            `[PROXY] Error response: ${res.status} - ${JSON.stringify(res.data)}`,
          );
        }

        const resHeaders: Record<string, string> = {};
        if (res.headers['content-type'])
          resHeaders['content-type'] = res.headers['content-type'] as string;

        return {
          status: res.status,
          data: res.data,
          headers: resHeaders,
        };
      };

      // Fallback 函數：返回服務不可用錯誤
      const fallback = () => {
        this.logger.warn(
          `[CIRCUIT BREAKER] Fallback triggered for ${serviceName}`,
        );
        return {
          status: 503,
          data: {
            message: 'Service Temporarily Unavailable',
            service: serviceName,
            path,
            error: 'Circuit breaker is open - service is experiencing issues',
          },
          headers: {},
        };
      };

      // 暫時禁用 Circuit Breaker，直接執行請求以便測試
      // const wrappedRequest = this.circuitBreaker.wrap(
      //   breakerName,
      //   makeRequest,
      //   API_GATEWAY_CONFIG,
      //   fallback
      // );
      // return await wrappedRequest();

      // 直接執行請求（無 Circuit Breaker）
      return await makeRequest();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; stack?: string };
      this.logger.error(`[PROXY] Request failed: ${method} ${path} -> ${url}`);
      this.logger.error(
        `[PROXY] Error details:`,
        err.stack || err.message || String(err),
      );

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        this.logger.error(`Gateway timeout: ${method} ${path}`, err.message);
        return {
          status: 504,
          data: { message: 'Gateway Timeout', path },
          headers: {},
        };
      }

      // Circuit breaker rejection or other errors
      if (err.message?.includes('Circuit breaker is open')) {
        return {
          status: 503,
          data: {
            message: 'Service Temporarily Unavailable',
            path,
            service: serviceName,
          },
          headers: {},
        };
      }

      this.logger.error(`Bad gateway: ${method} ${path}`, err.message);
      return {
        status: 502,
        data: { message: 'Bad Gateway', path },
        headers: {},
      };
    }
  }

  /**
   * 從路徑前綴提取服務名稱
   */
  private getServiceName(prefix: string): string {
    // '/api/auth' -> 'auth'
    // '/api/users' -> 'users'
    const match = prefix.match(/\/api\/([^/]+)/);
    return match ? match[1] : 'unknown';
  }
}
