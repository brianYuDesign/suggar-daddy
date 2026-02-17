/**
 * 測試用客戶端
 * 提供連接 PostgreSQL, Redis, Kafka 的客戶端
 */

import { DataSource } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { TestEnvironment } from './test-environment';

export class TestClients {
  private static dataSource: DataSource;
  private static redisClient: RedisClientType;
  private static kafka: Kafka;
  private static kafkaProducer: Producer;
  private static kafkaAdmin: Admin;

  /**
   * 初始化所有客戶端
   */
  static async initialize(): Promise<void> {
    const config = TestEnvironment.getConfig();

    // 初始化 PostgreSQL
    await this.initializePostgres(config.postgres);

    // 初始化 Redis
    await this.initializeRedis(config.redis);

    // 初始化 Kafka
    await this.initializeKafka(config.kafka);
  }

  /**
   * 關閉所有客戶端
   */
  static async close(): Promise<void> {
    try {
      if (this.dataSource?.isInitialized) {
        await this.dataSource.destroy();
      }

      if (this.redisClient?.isOpen) {
        await this.redisClient.quit();
      }

      if (this.kafkaProducer) {
        await this.kafkaProducer.disconnect();
      }

      if (this.kafkaAdmin) {
        await this.kafkaAdmin.disconnect();
      }
    } catch (error) {
      console.error('Error closing test clients:', error);
    }
  }

  /**
   * 取得 PostgreSQL DataSource
   */
  static getDataSource(): DataSource {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  /**
   * 取得 Redis 客戶端
   */
  static getRedis(): RedisClientType {
    if (!this.redisClient?.isOpen) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.redisClient;
  }

  /**
   * 取得 Kafka Producer
   */
  static getKafkaProducer(): Producer {
    if (!this.kafkaProducer) {
      throw new Error('Kafka producer not initialized. Call initialize() first.');
    }
    return this.kafkaProducer;
  }

  /**
   * 建立 Kafka Consumer
   */
  static createKafkaConsumer(groupId: string): Consumer {
    if (!this.kafka) {
      throw new Error('Kafka not initialized. Call initialize() first.');
    }
    return this.kafka.consumer({ groupId });
  }

  /**
   * 取得 Kafka Admin
   */
  static getKafkaAdmin(): Admin {
    if (!this.kafkaAdmin) {
      throw new Error('Kafka admin not initialized. Call initialize() first.');
    }
    return this.kafkaAdmin;
  }

  /**
   * 初始化 PostgreSQL
   */
  private static async initializePostgres(config: any): Promise<void> {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      synchronize: true, // 測試環境自動同步 schema
      dropSchema: false,
      logging: false,
      entities: [
        // 動態載入所有 entities
        __dirname + '/../../../apps/*/src/**/*.entity{.ts,.js}',
      ],
    });

    await this.dataSource.initialize();
    console.log('✓ PostgreSQL client connected');
  }

  /**
   * 初始化 Redis
   */
  private static async initializeRedis(config: any): Promise<void> {
    this.redisClient = createClient({
      socket: {
        host: config.host,
        port: config.port,
      },
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.redisClient.connect();
    console.log('✓ Redis client connected');
  }

  /**
   * 初始化 Kafka
   */
  private static async initializeKafka(config: any): Promise<void> {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    // 建立 Producer
    this.kafkaProducer = this.kafka.producer();
    await this.kafkaProducer.connect();

    // 建立 Admin
    this.kafkaAdmin = this.kafka.admin();
    await this.kafkaAdmin.connect();

    console.log('✓ Kafka client connected');
  }

  /**
   * 清空資料庫
   */
  static async clearDatabase(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * 清空 Redis
   */
  static async clearRedis(): Promise<void> {
    await this.redisClient.flushAll();
  }

  /**
   * 清空 Kafka Topics
   */
  static async clearKafkaTopics(topics: string[]): Promise<void> {
    try {
      const existingTopics = await this.kafkaAdmin.listTopics();
      const topicsToDelete = topics.filter((t) => existingTopics.includes(t));

      if (topicsToDelete.length > 0) {
        await this.kafkaAdmin.deleteTopics({
          topics: topicsToDelete,
        });

        // 重新建立 topics
        await this.kafkaAdmin.createTopics({
          topics: topicsToDelete.map((topic) => ({
            topic,
            numPartitions: 1,
            replicationFactor: 1,
          })),
        });
      }
    } catch (error) {
      console.error('Error clearing Kafka topics:', error);
    }
  }
}
