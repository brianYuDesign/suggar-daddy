import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService {
  private client: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.client.on('error', (err) => console.error('Redis error:', err));
    await this.client.connect();
    console.log('✅ Redis connected');
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const options = ttl ? { EX: ttl } : {};
    await this.client.setEx(key, ttl || 3600, JSON.stringify(value));
  }

  async del(key: string | string[]): Promise<number> {
    if (Array.isArray(key)) {
      return this.client.del(key);
    }
    return this.client.del([key]);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async getClient(): Promise<RedisClientType> {
    return this.client;
  }
}
