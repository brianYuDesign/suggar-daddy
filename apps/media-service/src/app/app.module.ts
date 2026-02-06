import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediaUploadController } from './media-upload.controller';
import { MediaUploadService } from './media-upload.service';
import { MediaUpload } from './entities/media-upload.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaUpload]),
  ],
  controllers: [AppController, MediaUploadController],
  providers: [AppService, MediaUploadService],
})
export class AppModule {}
