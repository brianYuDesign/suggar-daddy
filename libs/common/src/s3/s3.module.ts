import { Module, DynamicModule, Global } from '@nestjs/common';
import { S3Service } from './s3.service';

@Global()
@Module({})
export class S3Module {
  static forRoot(): DynamicModule {
    return {
      module: S3Module,
      providers: [S3Service],
      exports: [S3Service],
    };
  }
}
