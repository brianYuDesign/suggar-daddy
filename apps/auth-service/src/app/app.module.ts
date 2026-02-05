import { Module } from '@nestjs/common';
import { AuthModule } from '@suggar-daddy/auth';
import { RedisModule } from '@suggar-daddy/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [RedisModule.forRoot(), AuthModule],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
