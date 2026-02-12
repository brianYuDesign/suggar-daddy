/**
 * 用戶 API 的讀取來源（快取）。
 * API 讀取 → Redis；寫入 → Kafka（由 DB Writer 異步寫入 DB）。
 */
import { DynamicModule, Global, InjectionToken, Module, OptionalFactoryDependency } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

export interface RedisModuleOptions {
  url?: string;
  host?: string;
  port?: number;
}

@Global()
@Module({})
export class RedisModule {
  static forRootAsync(options: {
    inject?: (InjectionToken | OptionalFactoryDependency)[];
    useFactory: (...args: unknown[]) => RedisModuleOptions;
  }): DynamicModule {
    return {
      module: RedisModule,
      imports: options.inject ? [] : [],
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        {
          provide: Redis,
          inject: ['REDIS_OPTIONS'],
          useFactory: (opts: RedisModuleOptions) => {
            const url = opts?.url ?? process.env['REDIS_URL'];
            const parsed = url
              ? url
              : `redis://${opts?.host ?? 'localhost'}:${opts?.port ?? 6379}`;
            return new Redis(parsed, {
              maxRetriesPerRequest: 3,
              retryStrategy: (times) =>
                times > 3 ? null : Math.min(times * 200, 2000),
            });
          },
        },
        RedisService,
      ],
      exports: [RedisService, Redis],
    };
  }

  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const url = options.url ?? process.env['REDIS_URL'] ?? 'redis://localhost:6379';
    const redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    });
    return {
      module: RedisModule,
      providers: [
        {
          provide: Redis,
          useValue: redis,
        },
        RedisService,
      ],
      exports: [RedisService, Redis],
    };
  }
}
