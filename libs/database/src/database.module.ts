import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwipeEntity } from './entities/swipe.entity';
import { MatchEntity } from './entities/match.entity';
import { SkillEntity } from './entities/skill.entity';
import { UserSkillEntity } from './entities/user-skill.entity';
import { SkillRequestEntity } from './entities/skill-request.entity';
import { UserEntity } from './entities/user.entity';
import { InterestTagEntity } from './entities/interest-tag.entity';
import { UserInterestTagEntity } from './entities/user-interest-tag.entity';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    // Determine if High Availability mode is enabled
    const haEnabled = process.env.POSTGRES_HA_ENABLED === 'true';
    const masterHost = process.env.DB_HOST || process.env.POSTGRES_MASTER_HOST || process.env.DATABASE_HOST || process.env.POSTGRES_HOST || 'postgres-master';
    const replicaHost = process.env.POSTGRES_REPLICA_HOST || 'postgres-replica';
    const port = parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || '5432', 10);
    const username = process.env.DB_USERNAME || process.env.DATABASE_USER || process.env.POSTGRES_USER || 'postgres';
    const password = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
    const database = process.env.DB_DATABASE || process.env.DATABASE_NAME || process.env.POSTGRES_DB || 'suggar_daddy';

    // Base configuration shared between master and replica
    const baseConfig = {
      username,
      password,
      database,
      port,
      entities: [SwipeEntity, MatchEntity, SkillEntity, UserSkillEntity, SkillRequestEntity, UserEntity, InterestTagEntity, UserInterestTagEntity],
      synchronize: process.env.NODE_ENV !== 'production',
      autoLoadEntities: true,
      logging: process.env.NODE_ENV === 'development',
      // Connection pool settings
      extra: {
        max: 20, // Maximum connections
        min: 5,  // Minimum connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    };

    // Configuration with or without High Availability
    const typeOrmConfig = haEnabled
      ? {
          type: 'postgres' as const,
          replication: {
            master: {
              host: masterHost,
              ...baseConfig,
            },
            slaves: [
              {
                host: replicaHost,
                ...baseConfig,
              },
            ],
          },
        }
      : {
          type: 'postgres' as const,
          host: masterHost,
          ...baseConfig,
        };

    return {
      module: DatabaseModule,
      global: true,
      imports: [
        TypeOrmModule.forRoot(typeOrmConfig as any),
        TypeOrmModule.forFeature([SwipeEntity, MatchEntity]),
      ],
      exports: [TypeOrmModule],
    };
  }
}
