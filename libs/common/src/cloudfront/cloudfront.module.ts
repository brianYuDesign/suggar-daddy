import { Module, DynamicModule, Global } from '@nestjs/common';
import { CloudFrontSignedUrlService } from './cloudfront.service';

@Global()
@Module({})
export class CloudFrontModule {
  static forRoot(): DynamicModule {
    return {
      module: CloudFrontModule,
      providers: [CloudFrontSignedUrlService],
      exports: [CloudFrontSignedUrlService],
    };
  }
}
