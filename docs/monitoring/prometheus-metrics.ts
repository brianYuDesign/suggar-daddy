/**
 * Prometheus 指標收集中間件
 * 用於 Express 應用程序自動收集和導出指標
 */

import { Request, Response, NextFunction, Router } from 'express';
import * as prometheus from 'prom-client';

export class PrometheusMetrics {
  private httpRequestDuration: prometheus.Histogram;
  private httpRequestsTotal: prometheus.Counter;
  private httpResponseSize: prometheus.Histogram;
  private dbQueryDuration: prometheus.Histogram;
  private dbQueryErrors: prometheus.Counter;
  private cacheHits: prometheus.Counter;
  private cacheMisses: prometheus.Counter;
  private redisOperationDuration: prometheus.Histogram;
  private activeConnections: prometheus.Gauge;

  constructor() {
    // HTTP 請求延遲
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
    });

    // HTTP 請求總數
    this.httpRequestsTotal = new prometheus.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    // HTTP 響應大小
    this.httpResponseSize = new prometheus.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // 數據庫查詢延遲
    this.dbQueryDuration = new prometheus.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
    });

    // 數據庫查詢錯誤
    this.dbQueryErrors = new prometheus.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['query_type', 'error_type'],
    });

    // 緩存命中
    this.cacheHits = new prometheus.Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
    });

    // 緩存未命中
    this.cacheMisses = new prometheus.Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
    });

    // Redis 操作延遲
    this.redisOperationDuration = new prometheus.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5],
    });

    // 活動連接數
    this.activeConnections = new prometheus.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['service'],
    });

    // 設置默認指標收集器
    prometheus.collectDefaultMetrics({
      prefix: 'app_',
      timeout: 5000,
    });
  }

  /**
   * Express 中間件 - 自動記錄 HTTP 指標
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMem = process.memoryUsage().heapUsed;

      // 攔截響應發送
      const originalSend = res.send;
      res.send = function (data: any) {
        // 記錄指標
        const duration = (Date.now() - startTime) / 1000;
        const route = req.route?.path || req.path;

        // 記錄請求延遲
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode)
          .observe(duration);

        // 記錄請求總數
        this.httpRequestsTotal
          .labels(req.method, route, res.statusCode)
          .inc();

        // 記錄響應大小
        const responseSize = JSON.stringify(data).length;
        this.httpResponseSize.labels(req.method, route).observe(responseSize);

        // 調用原始 send
        return originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * 記錄數據庫查詢指標
   */
  recordDBQuery(
    queryType: string,
    table: string,
    duration: number,
    error?: Error,
  ): void {
    this.dbQueryDuration
      .labels(queryType, table)
      .observe(duration / 1000);

    if (error) {
      this.dbQueryErrors
        .labels(queryType, error.constructor.name)
        .inc();
    }
  }

  /**
   * 記錄緩存命中/未命中
   */
  recordCacheHit(cacheName: string, hit: boolean): void {
    if (hit) {
      this.cacheHits.labels(cacheName).inc();
    } else {
      this.cacheMisses.labels(cacheName).inc();
    }
  }

  /**
   * 記錄 Redis 操作
   */
  recordRedisOperation(operation: string, duration: number): void {
    this.redisOperationDuration
      .labels(operation)
      .observe(duration / 1000);
  }

  /**
   * 更新活動連接數
   */
  setActiveConnections(service: string, count: number): void {
    this.activeConnections.labels(service).set(count);
  }

  /**
   * 獲取 Prometheus 指標端點路由
   */
  getMetricsRouter(): Router {
    const router = Router();

    router.get('/metrics', async (req: Request, res: Response) => {
      res.set('Content-Type', prometheus.register.contentType);
      res.end(await prometheus.register.metrics());
    });

    return router;
  }
}

export default PrometheusMetrics;
