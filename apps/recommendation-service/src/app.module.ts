import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { User, Content, ContentTag, UserInterest, UserInteraction } from './database/entities';
import { RedisService } from './cache/redis.service';
import { RecommendationService } from './services/recommendation.service';
import { RecommendationController } from './modules/recommendations/recommendation.controller';
import { ContentController } from './modules/contents/content.controller';
import { ScheduledTasksService } from './services/scheduled-tasks.service';
import { AppDataSource } from './database/data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...AppDataSource.options,
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([User, Content, ContentTag, UserInterest, UserInteraction]),
    ScheduleModule.forRoot(),
  ],
  controllers: [RecommendationController, ContentController],
  providers: [RedisService, RecommendationService, ScheduledTasksService],
  exports: [RecommendationService, RedisService],
})
export class AppModule {}
