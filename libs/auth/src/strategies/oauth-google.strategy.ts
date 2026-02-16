import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

interface GoogleProfile {
  id: string;
  emails: Array<{ value: string; verified: boolean }>;
  displayName: string;
  name: {
    familyName: string;
    givenName: string;
  };
  photos: Array<{ value: string }>;
  provider: 'google';
}

export interface OAuthUser {
  provider: 'google' | 'apple';
  providerId: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    if (!profile.emails || profile.emails.length === 0) {
      return done(new UnauthorizedException('No email found in Google profile'), undefined);
    }

    const email = profile.emails[0];
    const user: OAuthUser = {
      provider: 'google',
      providerId: profile.id,
      email: email.value,
      emailVerified: email.verified,
      displayName: profile.displayName,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      photoUrl: profile.photos?.[0]?.value,
    };

    done(null, user);
  }
}
