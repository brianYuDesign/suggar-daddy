import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, Role, Permission, RolePermission, TokenBlacklist } from '@/entities';

export const databaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'auth_user',
  password: process.env.DB_PASSWORD || 'auth_password',
  database: process.env.DB_NAME || 'sugar_daddy_auth',
  entities: [User, Role, Permission, RolePermission, TokenBlacklist],
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || false,
  logging: process.env.DB_LOGGING === 'true' || false,
  dropSchema: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
