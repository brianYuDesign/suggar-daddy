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
    process.env['DB_WRITER_URL'] || 'http://db-writer-service:3010';

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
    } catch (error: unknown) {
      health.redis = {
        status: 'unhealthy',
        latencyMs: Date.now() - redisStart,
        error: (error as Error).message,
      };
    }

    // 檢查 PostgreSQL
    const dbStart = Date.now();
    try {
      await this.userRepo.query('SELECT 1');
      health.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
    } catch (error: unknown) {
      health.database = {
        status: 'unhealthy',
        latencyMs: Date.now() - dbStart,
        error: (error as Error).message,
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
    } catch (error: unknown) {
      this.logger.warn('無法連線至 db-writer-service: ' + (error as Error).message);
      return {
        status: 'unknown',
        error: '無法連線至 db-writer-service: ' + (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /** 取得 DLQ（Dead Letter Queue）統計 */
  async getDlqStats() {
    try {
      const response = await axios.get(this.dbWriterBaseUrl + '/dlq/stats', { timeout: 5000 });
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('無法取得 DLQ 統計: ' + (error as Error).message);
      return { error: '無法取得 DLQ 統計: ' + (error as Error).message, timestamp: new Date().toISOString() };
    }
  }

  /** 取得 DLQ 訊息列表 */
  async getDlqMessages() {
    try {
      const response = await axios.get(this.dbWriterBaseUrl + '/dlq/messages', { timeout: 5000 });
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('無法取得 DLQ 訊息: ' + (error as Error).message);
      return { messages: [], error: '無法取得 DLQ 訊息: ' + (error as Error).message };
    }
  }

  /** 重試單一 DLQ 訊息 */
  async retryDlqMessage(messageId: string) {
    try {
      const response = await axios.post(
        this.dbWriterBaseUrl + '/dlq/retry/' + messageId,
        {},
        { timeout: 5000 },
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('重試 DLQ 訊息失敗: ' + (error as Error).message);
      return { success: false, error: '重試失敗: ' + (error as Error).message };
    }
  }

  /** 重試所有 DLQ 訊息 */
  async retryAllDlqMessages() {
    try {
      const response = await axios.post(
        this.dbWriterBaseUrl + '/dlq/retry-all',
        {},
        { timeout: 10000 },
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('重試全部 DLQ 訊息失敗: ' + (error as Error).message);
      return { success: false, error: '重試全部失敗: ' + (error as Error).message };
    }
  }

  /** 刪除單一 DLQ 訊息 */
  async deleteDlqMessage(messageId: string) {
    try {
      const response = await axios.delete(
        this.dbWriterBaseUrl + '/dlq/messages/' + messageId,
        { timeout: 5000 },
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('刪除 DLQ 訊息失敗: ' + (error as Error).message);
      return { success: false, error: '刪除失敗: ' + (error as Error).message };
    }
  }

  /** 清除所有 DLQ 訊息 */
  async purgeDlqMessages() {
    try {
      const response = await axios.delete(
        this.dbWriterBaseUrl + '/dlq/purge',
        { timeout: 10000 },
      );
      return response.data;
    } catch (error: unknown) {
      this.logger.warn('清除 DLQ 失敗: ' + (error as Error).message);
      return { success: false, error: '清除失敗: ' + (error as Error).message };
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
    } catch (error: unknown) {
      this.logger.warn('無法取得一致性指標: ' + (error as Error).message);
      return { error: '無法取得一致性指標: ' + (error as Error).message, timestamp: new Date().toISOString() };
    }
  }
}
