/**
 * 測試環境設置
 * 管理 Docker 服務的啟動和清理
 */

import { execSync } from 'child_process';
import * as path from 'path';

const COMPOSE_FILE = path.join(__dirname, '../docker-compose.test.yml');
const PROJECT_NAME = 'suggar-daddy-test';

export class TestEnvironment {
  private static isSetup = false;

  /**
   * 啟動測試環境
   */
  static async setup(): Promise<void> {
    if (this.isSetup) {
      console.log('✓ Test environment already setup');
      return;
    }

    console.log('🚀 Starting test environment...');

    try {
      // 清理舊的容器
      await this.cleanup();

      // 啟動服務
      execSync(
        `docker-compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} up -d`,
        { stdio: 'inherit' }
      );

      // 等待服務健康檢查
      await this.waitForServices();

      this.isSetup = true;
      console.log('✓ Test environment ready');
    } catch (error) {
      console.error('✗ Failed to setup test environment:', error);
      throw error;
    }
  }

  /**
   * 清理測試環境
   */
  static async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    try {
      // 停止並移除容器
      execSync(
        `docker-compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down -v`,
        { stdio: 'pipe' }
      );

      this.isSetup = false;
      console.log('✓ Test environment cleaned up');
    } catch (error) {
      // 忽略清理錯誤
      console.warn('Warning: Cleanup had issues:', error.message);
    }
  }

  /**
   * 重置測試資料
   */
  static async resetData(): Promise<void> {
    console.log('♻️  Resetting test data...');

    try {
      // 清空 PostgreSQL
      execSync(
        `docker exec ${PROJECT_NAME}-postgres-test-1 psql -U test_user -d suggar_daddy_test -c "TRUNCATE TABLE users, posts, transactions, subscriptions, payments CASCADE;"`,
        { stdio: 'pipe' }
      );

      // 清空 Redis
      execSync(
        `docker exec ${PROJECT_NAME}-redis-test-1 redis-cli FLUSHALL`,
        { stdio: 'pipe' }
      );

      console.log('✓ Test data reset');
    } catch (error) {
      console.error('✗ Failed to reset test data:', error);
      throw error;
    }
  }

  /**
   * 等待所有服務健康
   */
  private static async waitForServices(): Promise<void> {
    const services = [
      'postgres-test',
      'redis-test',
      'kafka-test',
    ];

    console.log('⏳ Waiting for services to be healthy...');

    for (const service of services) {
      await this.waitForService(service);
    }

    // 額外等待 Kafka 完全就緒
    await this.sleep(3000);
  }

  /**
   * 等待單一服務健康
   */
  private static async waitForService(
    service: string,
    maxRetries = 30
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = execSync(
          `docker-compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} ps ${service}`,
          { encoding: 'utf-8' }
        );

        if (result.includes('(healthy)')) {
          console.log(`  ✓ ${service} is healthy`);
          return;
        }
      } catch (error) {
        // 繼續等待
      }

      await this.sleep(1000);
    }

    throw new Error(`Service ${service} failed to become healthy`);
  }

  /**
   * 等待指定時間
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 取得服務連線資訊
   */
  static getConfig() {
    return {
      postgres: {
        host: 'localhost',
        port: 5434,
        username: 'test_user',
        password: 'test_password',
        database: 'suggar_daddy_test',
      },
      redis: {
        host: 'localhost',
        port: 6380,
      },
      kafka: {
        brokers: ['localhost:9095'],
        clientId: 'test-client',
      },
    };
  }
}
