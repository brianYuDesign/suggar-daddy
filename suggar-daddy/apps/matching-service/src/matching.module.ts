import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { SwipeEntity, MatchEntity, UserEntity } from '@suggar-daddy/database';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_MASTER_HOST || 'localhost',
      port: parseInt(process.env.DB_MASTER_PORT || '5432'),
      username: process.env.DB_USERNAME || 'sugar_admin',
      password: process.env.DB_PASSWORD || 'sugar_password',
      database: process.env.DB_DATABASE || 'sugar_daddy',
      entities: [SwipeEntity, MatchEntity, UserEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([SwipeEntity, MatchEntity, UserEntity]),
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'matching-service',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          producer: {
            allowAutoTopicCreation: true,
          },
        },
      },
    ]),
    RedisModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
