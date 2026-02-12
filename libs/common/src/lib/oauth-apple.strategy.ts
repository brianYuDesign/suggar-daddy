import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { ConfigService } from '@nestjs/config';
import type { OAuthUser } from './oauth-google.strategy';

interface AppleProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: {
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Apple Sign-In Strategy
 * 
 * 使用方式：
 * 1. 設定環境變數：
 *    - APPLE_CLIENT_ID (Service ID from Apple Developer)
 *    - APPLE_TEAM_ID (Apple Developer Team ID)
 *    - APPLE_KEY_ID (Key ID for the private key)
 *    - APPLE_PRIVATE_KEY_PATH (Path to .p8 private key file)
 *    - APPLE_CALLBACK_URL (例如：http://localhost:3002/api/auth/apple/callback)
 * 
 * 2. 在 Controller 中使用：
 *    @Post('apple')
 *    @UseGuards(AuthGuard('apple'))
 *    async appleAuth() {}
 * 
 *    @Post('apple/callback')
 *    @UseGuards(AuthGuard('apple'))
 *    async appleAuthCallback(@Request() req) {
 *      return this.authService.handleOAuthLogin(req.user);
 *    }
 * 
 * 注意：
 * - Apple Sign-In 需要使用 POST 而非 GET
 * - 需要在 Apple Developer Console 配置 Service ID 和 Return URLs
 * - 首次登入時會提供用戶名稱，之後不會再提供（需要存儲）
 */
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID'),
      teamID: configService.get<string>('APPLE_TEAM_ID'),
      keyID: configService.get<string>('APPLE_KEY_ID'),
      privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_PATH'),
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL'),
      scope: ['email', 'name'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: AppleProfile,
    done: (error: Error | null, user?: OAuthUser) => void,
  ): Promise<void> {
    if (!profile.email) {
      return done(new UnauthorizedException('No email found in Apple profile'), undefined);
    }

    const user: OAuthUser = {
      provider: 'apple',
      providerId: profile.id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      displayName: profile.name
        ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim()
        : profile.email.split('@')[0],
      firstName: profile.name?.firstName,
      lastName: profile.name?.lastName,
    };

    done(null, user);
  }
}
