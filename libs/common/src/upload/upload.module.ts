import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { configureCloudinary } from './cloudinary.config';

@Global()
@Module({})
export class UploadModule {
  static forRoot(): DynamicModule {
    return {
      module: UploadModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'CLOUDINARY_CONFIG',
          useFactory: (configService: ConfigService) => {
            return configureCloudinary({
              cloudName: configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '',
              apiKey: configService.get<string>('CLOUDINARY_API_KEY') ?? '',
              apiSecret: configService.get<string>('CLOUDINARY_API_SECRET') ?? '',
            });
          },
          inject: [ConfigService],
        },
        UploadService,
      ],
      exports: [UploadService],
    };
  }
}