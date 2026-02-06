import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { getDatabaseConfig } from '@suggar-daddy/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaFile } from './entities/media-file.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(
      getDatabaseConfig([MediaFile])
    ),
    TypeOrmModule.forFeature([MediaFile]),
  ],
  controllers: [AppController, MediaController],
  providers: [AppService, MediaService],
})
export class AppModule {}