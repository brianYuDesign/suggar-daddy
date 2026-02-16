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

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('APPLE_CLIENT_ID') || '',
      teamID: configService.get<string>('APPLE_TEAM_ID') || '',
      keyID: configService.get<string>('APPLE_KEY_ID') || '',
      privateKeyLocation: configService.get<string>('APPLE_PRIVATE_KEY_PATH') || '',
      callbackURL: configService.get<string>('APPLE_CALLBACK_URL') || '',
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
