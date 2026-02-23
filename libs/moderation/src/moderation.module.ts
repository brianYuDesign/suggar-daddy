import { Module, DynamicModule } from '@nestjs/common';
import { TextFilterService } from './text-filter.service';
import { ModerationModuleOptions } from './moderation.types';

@Module({})
export class ModerationModule {
  static forRoot(options?: ModerationModuleOptions): DynamicModule {
    return {
      module: ModerationModule,
      global: false,
      providers: [
        {
          provide: 'MODERATION_OPTIONS',
          useValue: {
            enabled: true,
            nsfwAutoHideThreshold: 0.8,
            nsfwFlagThreshold: 0.5,
            ...options,
          },
        },
        TextFilterService,
      ],
      exports: [TextFilterService, 'MODERATION_OPTIONS'],
    };
  }
}
