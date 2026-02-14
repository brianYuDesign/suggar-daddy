/**
 * 用戶 API 的讀取來源（快取）。
 * API 讀取 → Redis；寫入 → Kafka（由 DB Writer 異步寫入 DB）。
 * 
 * 支援 Redis Sentinel 高可用性架構
 */
import { DynamicModule, Global, InjectionToken, Module, OptionalFactoryDependency } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

export interface RedisModuleOptions {
  url?: string;
  host?: string;
  port?: number;
  sentinels?: Array<{ host: string; port: number }>;
  name?: string; // Sentinel master name
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
            return RedisModule.createRedisClient(opts);
          },
        },
        RedisService,
      ],
      exports: [RedisService, Redis],
    };
  }

  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const redis = RedisModule.createRedisClient(options);
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

  /**
   * 創建 Redis 客戶端，支援 Sentinel 和單機模式
   */
  private static createRedisClient(options: RedisModuleOptions): Redis {
    // 檢查是否使用 Sentinel 模式
    const sentinelsEnv = process.env['REDIS_SENTINELS'];
    const masterNameEnv = process.env['REDIS_MASTER_NAME'];

    if (sentinelsEnv && masterNameEnv) {
      // Sentinel 模式
      const sentinels = sentinelsEnv.split(',').map(s => {
        const [host, port] = s.trim().split(':');
        return { host, port: parseInt(port, 10) };
      });

      console.log(`[RedisModule] 🛡️ 連接到 Redis Sentinel 集群`);
      console.log(`[RedisModule] Sentinels: ${sentinelsEnv}`);
      console.log(`[RedisModule] Master Name: ${masterNameEnv}`);

      return new Redis({
        sentinels,
        name: masterNameEnv,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 200, 2000);
          console.log(`[RedisModule] ⚠️ 重試連接 (${times}次)，延遲 ${delay}ms`);
          return times > 3 ? null : delay;
        },
        sentinelRetryStrategy: (times) => {
          const delay = Math.min(times * 500, 3000);
          console.log(`[RedisModule] ⚠️ Sentinel 重試 (${times}次)，延遲 ${delay}ms`);
          return times > 3 ? null : delay;
        },
        // Sentinel 專用配置
        sentinelMaxConnections: 10,
        enableReadyCheck: true,
        // 連接超時
        connectTimeout: 10000,
        // 自動重連
        reconnectOnError: (err) => {
          console.error('[RedisModule] ❌ Redis 錯誤:', err.message);
          return true; // 發生錯誤時自動重連
        },
      });
    } else if (options.sentinels && options.name) {
      // 從 options 指定的 Sentinel 模式
      console.log(`[RedisModule] 🛡️ 連接到 Redis Sentinel (from options)`);
      console.log(`[RedisModule] Master Name: ${options.name}`);

      return new Redis({
        sentinels: options.sentinels,
        name: options.name,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) =>
          times > 3 ? null : Math.min(times * 200, 2000),
        sentinelRetryStrategy: (times) =>
          times > 3 ? null : Math.min(times * 500, 3000),
      });
    } else {
      // 單機模式（向後兼容）
      const host = options.host ?? process.env['REDIS_HOST'] ?? 'localhost';
      const port = Number(options.port ?? process.env['REDIS_PORT'] ?? 6379);
      const url = options.url ?? process.env['REDIS_URL'];

      console.log(`[RedisModule] 📍 連接到單機 Redis: ${url ?? `redis://${host}:${port}`}`);

      const redisOptions: import('ioredis').RedisOptions = {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        keepAlive: 30000,
        retryStrategy: (times) =>
          times > 3 ? null : Math.min(times * 200, 2000),
      };

      if (url) {
        return new Redis(url, redisOptions);
      }
      return new Redis({ ...redisOptions, host, port });
    }
  }
}

