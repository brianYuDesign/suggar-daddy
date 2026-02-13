import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './strategies/oauth-google.strategy';
import { AppleStrategy } from './strategies/oauth-apple.strategy';
import { OAuthService } from './services/oauth.service';

@Module({})
export class OAuthModule {
  static forRoot(): DynamicModule {
    const providers: Provider[] = [OAuthService];

    // Conditionally register Google strategy
    const googleProvider: Provider = {
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
        if (!clientId) return null;
        return new GoogleStrategy(configService);
      },
      inject: [ConfigService],
    };

    // Conditionally register Apple strategy
    const appleProvider: Provider = {
      provide: AppleStrategy,
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('APPLE_CLIENT_ID');
        if (!clientId) return null;
        return new AppleStrategy(configService);
      },
      inject: [ConfigService],
    };

    providers.push(googleProvider, appleProvider);

    return {
      module: OAuthModule,
      providers,
      exports: [OAuthService, GoogleStrategy, AppleStrategy],
    };
  }
}
