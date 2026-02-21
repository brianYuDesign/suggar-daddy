import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard, RolesGuard } from "@suggar-daddy/auth";
import { EnvConfigModule, AppConfigService } from "@suggar-daddy/common";
import { DatabaseModule, InterestTagEntity, UserInterestTagEntity } from "@suggar-daddy/database";
import { RedisModule } from "@suggar-daddy/redis";
import { KafkaModule } from "@suggar-daddy/kafka";
import { AuthModule } from "@suggar-daddy/auth";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { ReportService } from "./report.service";
import { TagController } from "./tag.controller";
import { TagService } from "./tag.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    EnvConfigModule,
    AuthModule,
    DatabaseModule.forRoot(),
    TypeOrmModule.forFeature([InterestTagEntity, UserInterestTagEntity]),
    RedisModule.forRoot(),
    KafkaModule.forRootAsync({
      useFactory: (config: AppConfigService) => ({
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
        groupId: config.kafkaGroupId,
      }),
      inject: [AppConfigService],
    }),
  ],
  controllers: [AppController, UserController, TagController],
  providers: [
    AppService,
    UserService,
    ReportService,
    TagService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
