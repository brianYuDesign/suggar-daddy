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
      // 檢查服務是否已經運行（由 run-tests.sh 啟動）
      const isRunning = this.checkServicesRunning();
      
      if (isRunning) {
        console.log('✓ Test services are already running');
        this.isSetup = true;
        return;
      }

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
   * 檢查測試服務是否已運行
   */
  private static checkServicesRunning(): boolean {
    try {
      const result = execSync(
        `docker-compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} ps --services --filter "status=running"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const runningServices = result.trim().split('\n').filter(s => s);
      // 至少需要 postgres, redis, kafka 三個服務
      return runningServices.length >= 3;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清理測試環境
   */
  static async cleanup(): Promise<void> {
    // 不要清理由 run-tests.sh 管理的環境
    // 只重置靜態標記
    if (this.isSetup && this.checkServicesRunning()) {
      console.log('✓ Test environment managed by test runner, skipping cleanup');
      this.isSetup = false;
      return;
    }

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
    const infrastructureServices = [
      'postgres-test',
      'redis-test',
      'kafka-test',
    ];

    const microservices = [
      'auth-service-test',
      'user-service-test',
      'content-service-test',
      'payment-service-test',
    ];

    const gateway = ['api-gateway-test'];

    console.log('⏳ Waiting for infrastructure services...');
    for (const service of infrastructureServices) {
      await this.waitForService(service);
    }

    console.log('⏳ Waiting for microservices...');
    for (const service of microservices) {
      await this.waitForService(service, 60); // 微服務需要更長時間啟動
    }

    console.log('⏳ Waiting for API Gateway...');
    for (const service of gateway) {
      await this.waitForService(service, 60);
    }

    // 額外等待服務完全就緒
    await this.sleep(5000);
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
        port: 6382,
      },
      kafka: {
        brokers: ['localhost:9095'],
        clientId: 'test-client',
      },
      // API Gateway URL - 統一入口
      apiGateway: 'http://localhost:3100',
      // 直接訪問微服務的 URL（如果需要）
      services: {
        auth: 'http://localhost:3102',
        user: 'http://localhost:3101',
        content: 'http://localhost:3106',
        payment: 'http://localhost:3107',
      },
    };
  }
}
