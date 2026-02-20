import { DataSource } from 'typeorm';
import { User, Content, ContentTag, UserInterest, UserInteraction } from './entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432'),
  username: process.env.DATABASE_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || process.env.DB_DATABASE || 'recommendation_db',
  entities: [User, Content, ContentTag, UserInterest, UserInteraction],
  migrations: ['src/database/migrations/**/*.ts'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
});
