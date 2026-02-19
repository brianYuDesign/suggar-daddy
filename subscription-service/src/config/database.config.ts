import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmModule } from '@nestjs/typeorm';

@Injectable()
export class DatabaseConfigService {
  getDatabaseConfig(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'subscription_db',
      entities: [__dirname + '/../entities/**/*.entity.{js,ts}'],
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
    };
  }
}
