import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard, AuthModule } from '@suggar-daddy/auth';
import { EnvConfigModule, AppConfigService } from '@suggar-daddy/common';
import { DatabaseModule, SkillEntity, UserSkillEntity, SkillRequestEntity } from '@suggar-daddy/database';
import { RedisModule } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { Kafka } from 'kafkajs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SkillController } from './skill.controller';
import { SkillService } from './skill.service';
import { SkillRepository } from './skill.repository';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EnvConfigModule,
    AuthModule,
    DatabaseModule.forRoot(),
    TypeOrmModule.forFeature([SkillEntity, UserSkillEntity, SkillRequestEntity]),
    RedisModule.forRoot(),
  ],
  controllers: [SkillController], // Removed AppController
  providers: [
    SkillService,
    SkillRepository,
    {
      provide: 'KAFKA_OPTIONS',
      useFactory: (config: AppConfigService) => ({
        clientId: 'skill-service',
        brokers: config.kafkaBrokers,
      }),
      inject: [AppConfigService],
    },
    KafkaProducerService,
    // Global RolesGuard only (JWT checked per-route)
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
