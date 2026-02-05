import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [],
  controllers: [AppController, MatchingController],
  providers: [AppService, MatchingService],
})
export class AppModule {}
