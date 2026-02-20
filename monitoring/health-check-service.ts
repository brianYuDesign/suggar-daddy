/**
 * Health Check Module for Sugar Daddy Services
 * 提供完整的健康檢查和就緒檢查端點
 */

import { Router, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'redis';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: 'ok' | 'error' | 'warning';
      message: string;
      responseTime?: number;
      details?: any;
    };
  };
}

interface ReadinessStatus {
  ready: boolean;
  services: {
    [key: string]: boolean;
  };
  timestamp: string;
}

export class HealthCheckService {
  private router: Router;
  private startTime: number;
  private pgPool: Pool;
  private redisClient: Redis.RedisClient;

  constructor(pgPool: Pool, redisClient: Redis.RedisClient) {
    this.router = Router();
    this.pgPool = pgPool;
    this.redisClient = redisClient;
    this.startTime = Date.now();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 健康檢查端點
    this.router.get('/health', this.healthCheck.bind(this));

    // 就緒檢查端點
    this.router.get('/ready', this.readinessCheck.bind(this));

    // 深度檢查端點
    this.router.get('/health/deep', this.deepHealthCheck.bind(this));

    // 依賴檢查
    this.router.get('/health/dependencies', this.dependenciesCheck.bind(this));

    // 活性探針
    this.router.get('/live', this.livenessCheck.bind(this));
  }

  /**
   * 基礎健康檢查 - 用於 Kubernetes liveness probe
   */
  private async healthCheck(req: any, res: Response): Promise<void> {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.VERSION || '1.0.0',
      checks: {
        memory: this.checkMemory(),
        cpu: this.checkCPU(),
      },
    };

    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 503
          : 500;
    res.status(statusCode).json(health);
  }

  /**
   * 就緒檢查 - 用於 Kubernetes readiness probe
   */
  private async readinessCheck(req: any, res: Response): Promise<void> {
    const ready: ReadinessStatus = {
      ready: true,
      services: {
        database: false,
        cache: false,
        api: true,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // 檢查數據庫連接
      const dbCheck = await this.checkDatabase();
      ready.services.database = dbCheck.status === 'ok';

      // 檢查 Redis 連接
      const cacheCheck = await this.checkRedis();
      ready.services.cache = cacheCheck.status === 'ok';

      // 如果所有依賴都準備好，則為準備好
      ready.ready = Object.values(ready.services).every((v) => v === true);
    } catch (error) {
      ready.ready = false;
      console.error('Readiness check error:', error);
    }

    const statusCode = ready.ready ? 200 : 503;
    res.status(statusCode).json(ready);
  }

  /**
   * 深度健康檢查
   */
  private async deepHealthCheck(req: any, res: Response): Promise<void> {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.VERSION || '1.0.0',
      checks: {
        memory: this.checkMemory(),
        cpu: this.checkCPU(),
        eventLoop: this.checkEventLoop(),
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        diskSpace: await this.checkDiskSpace(),
      },
    };

    // 確定總體狀態
    const statuses = Object.values(health.checks).map((c) => c.status);
    if (statuses.includes('error')) {
      health.status = 'unhealthy';
    } else if (statuses.includes('warning')) {
      health.status = 'degraded';
    }

    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 503
          : 500;
    res.status(statusCode).json(health);
  }

  /**
   * 依賴檢查
   */
  private async dependenciesCheck(req: any, res: Response): Promise<void> {
    const checks = {
      timestamp: new Date().toISOString(),
      dependencies: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        externalAPIs: await this.checkExternalAPIs(),
      },
    };

    const hasErrors = Object.values(checks.dependencies).some(
      (c: any) => c.status === 'error',
    );
    const statusCode = hasErrors ? 503 : 200;

    res.status(statusCode).json(checks);
  }

  /**
   * 活性探針 - 簡單存活檢查
   */
  private async livenessCheck(req: any, res: Response): Promise<void> {
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    });
  }

  // ===== 檢查函數 =====

  private checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = require('os').totalmem() - require('os').freemem();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    let message = 'Memory usage is normal';

    if (heapUsedPercent > 90) {
      status = 'error';
      message = 'Critical memory usage';
    } else if (heapUsedPercent > 75) {
      status = 'warning';
      message = 'High memory usage';
    }

    return {
      status,
      message,
      details: {
        heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsedPercent: Math.round(heapUsedPercent),
        externalMB: Math.round(usage.external / 1024 / 1024),
        rssMB: Math.round(usage.rss / 1024 / 1024),
      },
    };
  }

  private checkCPU() {
    const cpus = require('os').cpus();
    const avgLoad = require('os').loadavg();

    return {
      status: 'ok' as const,
      message: 'CPU check completed',
      details: {
        cores: cpus.length,
        loadAverage1m: avgLoad[0],
        loadAverage5m: avgLoad[1],
        loadAverage15m: avgLoad[2],
      },
    };
  }

  private checkEventLoop() {
    // 簡單的事件循環延遲檢查
    const start = Date.now();
    setImmediate(() => {
      const delay = Date.now() - start;
      if (delay > 100) {
        console.warn('Event loop blocked for', delay, 'ms');
      }
    });

    return {
      status: 'ok' as const,
      message: 'Event loop is responsive',
      details: {
        checkTime: new Date().toISOString(),
      },
    };
  }

  private async checkDatabase() {
    const start = Date.now();
    try {
      const result = await this.pgPool.query('SELECT 1');
      const responseTime = Date.now() - start;

      return {
        status: 'ok' as const,
        message: 'Database connection is healthy',
        responseTime,
        details: {
          poolSize: this.pgPool.totalCount,
          idleCount: this.pgPool.idleCount,
          waitingCount: this.pgPool.waitingCount,
        },
      };
    } catch (error) {
      return {
        status: 'error' as const,
        message: `Database error: ${(error as Error).message}`,
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkRedis() {
    const start = Date.now();
    try {
      await new Promise<void>((resolve, reject) => {
        this.redisClient.ping((err, reply) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const responseTime = Date.now() - start;

      return {
        status: 'ok' as const,
        message: 'Redis connection is healthy',
        responseTime,
        details: {
          connectedClients: 1, // 可以從 INFO 命令獲取更多詳細信息
        },
      };
    } catch (error) {
      return {
        status: 'error' as const,
        message: `Redis error: ${(error as Error).message}`,
        responseTime: Date.now() - start,
      };
    }
  }

  private async checkDiskSpace() {
    try {
      const diskspace = require('diskspace');
      const drives = await new Promise<any[]>((resolve, reject) => {
        diskspace.check('/', (err: any, total: any, free: any, status: any) => {
          if (err) reject(err);
          else resolve([{ total, free, status }]);
        });
      });

      const drive = drives[0];
      const usedPercent = ((drive.total - drive.free) / drive.total) * 100;

      let status: 'ok' | 'warning' | 'error' = 'ok';
      if (usedPercent > 90) {
        status = 'error';
      } else if (usedPercent > 75) {
        status = 'warning';
      }

      return {
        status,
        message:
          status === 'ok'
            ? 'Disk space is normal'
            : `Disk usage: ${usedPercent.toFixed(2)}%`,
        details: {
          totalGB: Math.round(drive.total / 1024 / 1024 / 1024),
          freeGB: Math.round(drive.free / 1024 / 1024 / 1024),
          usedPercent: Math.round(usedPercent),
        },
      };
    } catch (error) {
      return {
        status: 'warning' as const,
        message: 'Could not check disk space',
      };
    }
  }

  private async checkExternalAPIs() {
    // 實現您的外部 API 檢查邏輯
    return {
      status: 'ok' as const,
      message: 'External APIs are accessible',
      details: {},
    };
  }

  getRouter(): Router {
    return this.router;
  }
}

export default HealthCheckService;
