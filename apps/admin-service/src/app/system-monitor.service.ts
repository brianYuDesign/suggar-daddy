/**
 * 系統監控服務
 * 提供 Redis/DB 健康檢查、Kafka 狀態、DLQ 統計、一致性指標等功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';
import axios from 'axios';

@Injectable()
export class SystemMonitorService {
  private readonly logger = new Logger(SystemMonitorService.name);

  /** db-writer-service 的 API 基底 URL */
  private readonly dbWriterBaseUrl =
    process.env['DB_WRITER_URL'] || 'http://localhost:3010';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly redisService: RedisService,
  ) {}

  /** 取得系統健康狀態，檢查 Redis 和 PostgreSQL 連線 */
  async getSystemHealth() {
    const health: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // 檢查 Redis
    const redisStart = Date.now();
    try {
      await this.redisService.setex('health:ping', 10, 'pong');
      const val = await this.redisService.get('health:ping');
      health.redis = {
        status: val === 'pong' ? 'healthy' : 'degraded',
        latencyMs: Date.now() - redisStart,
      };
    } catch (error: any) {
      health.redis = {
        status: 'unhealthy',
        latencyMs: Date.now() - redisStart,
        error: error.message,
      };
    }

    // 檢查 PostgreSQL
    const dbStart = Date.now();
    try {
      await this.userRepo.query('SELECT 1');
      health.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
    } catch (error: any) {
      health.database = {
        status: 'unhealthy',
        latencyMs: Date.now() - dbStart,
        error: error.message,
      };
    }

    const overallStatus = Object.values(health).every((h) => h.status === 'healthy')
      ? 'healthy'
      : Object.values(health).some((h) => h.status === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';

    return { status: overallStatus, services: health, timestamp: new Date().toISOString() };
  }

  /** 取得 Kafka 消費者狀態 */
  async getKafkaStatus() {
    try {
      const response = await axios.get(this.dbWriterBaseUrl + '/health', { timeout: 5000 });
      return {
        status: 'connected',
        dbWriterHealth: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.warn('無法連線至 db-writer-service: ' + error.message);
      return {
        status: 'unknown',
        error: '無法連線至 db-writer-service: ' + error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** 取得 DLQ（Dead Letter Queue）統計 */
  async getDlqStats() {
    try {
      const response = await axios.get(this.dbWriterBaseUrl + '/dlq/stats', { timeout: 5000 });
      return response.data;
    } catch (error: any) {
      this.logger.warn('無法取得 DLQ 統計: ' + error.message);
      return { error: '無法取得 DLQ 統計: ' + error.message, timestamp: new Date().toISOString() };
    }
  }

  /** 取得資料一致性指標 */
  async getConsistencyMetrics() {
    try {
      const response = await axios.get(
        this.dbWriterBaseUrl + '/consistency/metrics',
        { timeout: 5000 },
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn('無法取得一致性指標: ' + error.message);
      return { error: '無法取得一致性指標: ' + error.message, timestamp: new Date().toISOString() };
    }
  }
}
