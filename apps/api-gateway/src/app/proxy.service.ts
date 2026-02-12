import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ProxyTarget {
  prefix: string;
  baseUrl: string;
}

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly client: AxiosInstance;
  private readonly targets: ProxyTarget[] = [];

  constructor(private readonly config: ConfigService) {
    this.client = axios.create({
      timeout: 30000,
      validateStatus: () => true,
    });
    this.targets = [
      {
        prefix: '/api/v1/auth',
        baseUrl: this.config.get<string>('AUTH_SERVICE_URL', 'http://localhost:3002'),
      },
      {
        prefix: '/api/v1/users',
        baseUrl: this.config.get<string>('USER_SERVICE_URL', 'http://localhost:3001'),
      },
      {
        prefix: '/api/v1/matching',
        baseUrl: this.config.get<string>('MATCHING_SERVICE_URL', 'http://localhost:3003'),
      },
      {
        prefix: '/api/v1/notifications',
        baseUrl: this.config.get<string>('NOTIFICATION_SERVICE_URL', 'http://localhost:3004'),
      },
      {
        prefix: '/api/v1/messaging',
        baseUrl: this.config.get<string>('MESSAGING_SERVICE_URL', 'http://localhost:3005'),
      },
      {
        prefix: '/api/moderation',
        baseUrl: this.config.get<string>('CONTENT_SERVICE_URL', 'http://localhost:3006'),
      },
      {
        prefix: '/api/posts',
        baseUrl: this.config.get<string>('CONTENT_SERVICE_URL', 'http://localhost:3006'),
      },
      {
        prefix: '/api/tips',
        baseUrl: this.config.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3007'),
      },
      {
        prefix: '/api/post-purchases',
        baseUrl: this.config.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3007'),
      },
      {
        prefix: '/api/transactions',
        baseUrl: this.config.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3007'),
      },
      {
        prefix: '/api/stripe',
        baseUrl: this.config.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3007'),
      },
      {
        prefix: '/api/wallet',
        baseUrl: this.config.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3007'),
      },
      {
        prefix: '/api/subscription-tiers',
        baseUrl: this.config.get<string>('SUBSCRIPTION_SERVICE_URL', 'http://localhost:3005'),
      },
      {
        prefix: '/api/subscriptions',
        baseUrl: this.config.get<string>('SUBSCRIPTION_SERVICE_URL', 'http://localhost:3005'),
      },
      {
        prefix: '/api/upload',
        baseUrl: this.config.get<string>('MEDIA_SERVICE_URL', 'http://localhost:3008'),
      },
      {
        prefix: '/api/media',
        baseUrl: this.config.get<string>('MEDIA_SERVICE_URL', 'http://localhost:3008'),
      },
      {
        prefix: '/api/v1/admin',
        baseUrl: this.config.get<string>('ADMIN_SERVICE_URL', 'http://localhost:3011'),
      },
    ].sort((a, b) => b.prefix.length - a.prefix.length);
  }

  getTarget(path: string): ProxyTarget | null {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return this.targets.find((t) => normalized.startsWith(t.prefix)) ?? null;
  }

  async forward(
    method: string,
    path: string,
    query: string,
    headers: Record<string, string>,
    body: unknown
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
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
    if (headers['authorization']) forwardHeaders['authorization'] = headers['authorization'];
    if (headers['content-type']) forwardHeaders['content-type'] = headers['content-type'];
    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      headers: forwardHeaders,
      data: body,
    };
    this.logger.debug(`${method} ${path} -> ${url}`);
    const res = await this.client.request(config);
    const resHeaders: Record<string, string> = {};
    if (res.headers['content-type']) resHeaders['content-type'] = res.headers['content-type'] as string;
    return {
      status: res.status,
      data: res.data,
      headers: resHeaders,
    };
  }
}
