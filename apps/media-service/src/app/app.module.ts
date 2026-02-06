import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [],
  controllers: [AppController, MediaController],
  providers: [AppService, MediaService],
})
export class AppModule {}