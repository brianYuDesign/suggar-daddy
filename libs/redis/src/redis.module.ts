/**
 * 用戶 API 的讀取來源（快取）。
 * API 讀取 → Redis；寫入 → Kafka（由 DB Writer 異步寫入 DB）。
 */
import { DynamicModule, Global, Module } from '@nestjs/common';
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
  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const url = options.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
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
