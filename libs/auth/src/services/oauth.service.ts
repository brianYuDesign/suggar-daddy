import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import type { OAuthUser } from '../strategies/oauth-google.strategy';
import type { TokenResponseDto } from '@suggar-daddy/dto';
import * as crypto from 'crypto';

interface OAuthTokenResponse extends TokenResponseDto {
  user: {
    userId: string;
    email: string;
    role: string;
    displayName: string;
  };
}

const USER_EMAIL_PREFIX = 'user:email:';
const USER_OAUTH_PREFIX = 'user:oauth:';
const AUTH_REFRESH_PREFIX = 'auth:refresh:';
const REFRESH_EXPIRES_SEC = 7 * 24 * 60 * 60; // 7 days
const ACCESS_EXPIRES_SEC = 15 * 60; // 15 min
const USER_CREATED = 'user.created';
const USER_UPDATED = 'user.updated';

interface StoredUser {
  userId: string;
  email: string;
  passwordHash?: string;
  role: string;
  displayName: string;
  bio?: string;
  accountStatus: 'active' | 'suspended' | 'banned';
  emailVerified: boolean;
  createdAt: string;
  oauthProvider?: 'google' | 'apple';
  oauthProviderId?: string;
  photoUrl?: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async handleOAuthLogin(oauthUser: OAuthUser): Promise<OAuthTokenResponse> {
    this.logger.log(
      `OAuth login attempt: provider=${oauthUser.provider}, email=${oauthUser.email}`,
    );

    // 1. Check existing OAuth mapping
    const oauthKey = `${USER_OAUTH_PREFIX}${oauthUser.provider}:${oauthUser.providerId}`;
    const existingUserIdByOAuth = await this.redis.get(oauthKey);

    if (existingUserIdByOAuth) {
      const user = await this.getUserById(existingUserIdByOAuth);
      this.logger.log(`Existing OAuth user found: userId=${user.userId}`);
      return this.generateTokens(user);
    }

    // 2. Check existing email mapping
    const emailKey = USER_EMAIL_PREFIX + oauthUser.email.toLowerCase();
    const existingUserIdByEmail = await this.redis.get(emailKey);

    if (existingUserIdByEmail) {
      const user = await this.getUserById(existingUserIdByEmail);
      await this.linkOAuthAccount(user.userId, oauthUser);
      this.logger.log(
        `OAuth linked to existing email: userId=${user.userId}, provider=${oauthUser.provider}`,
      );
      return this.generateTokens(user);
    }

    // 3. New user
    return this.createOAuthUser(oauthUser);
  }

  private async createOAuthUser(oauthUser: OAuthUser): Promise<OAuthTokenResponse> {
    const userId = crypto.randomUUID();
    const emailKey = USER_EMAIL_PREFIX + oauthUser.email.toLowerCase();
    const oauthKey = `${USER_OAUTH_PREFIX}${oauthUser.provider}:${oauthUser.providerId}`;

    const newUser: StoredUser = {
      userId,
      email: oauthUser.email.toLowerCase(),
      role: 'subscriber',
      displayName: oauthUser.displayName || oauthUser.email.split('@')[0],
      accountStatus: 'active',
      emailVerified: oauthUser.emailVerified,
      createdAt: new Date().toISOString(),
      oauthProvider: oauthUser.provider,
      oauthProviderId: oauthUser.providerId,
      photoUrl: oauthUser.photoUrl,
    };

    // Store user data
    await this.redis.set(`user:${userId}`, JSON.stringify(newUser));
    await this.redis.set(emailKey, userId);
    await this.redis.set(oauthKey, userId);

    // Kafka event
    await this.kafkaProducer.sendEvent(USER_CREATED, {
      userId,
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role,
      accountStatus: newUser.accountStatus,
      emailVerified: newUser.emailVerified,
      oauthProvider: newUser.oauthProvider,
      oauthProviderId: newUser.oauthProviderId,
      photoUrl: newUser.photoUrl,
      createdAt: newUser.createdAt,
    });

    this.logger.log(
      `New OAuth user created: userId=${userId}, provider=${oauthUser.provider}`,
    );

    return this.generateTokens(newUser);
  }

  private async linkOAuthAccount(userId: string, oauthUser: OAuthUser): Promise<void> {
    const oauthKey = `${USER_OAUTH_PREFIX}${oauthUser.provider}:${oauthUser.providerId}`;
    await this.redis.set(oauthKey, userId);

    await this.kafkaProducer.sendEvent(USER_UPDATED, {
      userId,
      oauthProvider: oauthUser.provider,
      oauthProviderId: oauthUser.providerId,
      photoUrl: oauthUser.photoUrl,
      updatedAt: new Date().toISOString(),
    });
  }

  private async getUserById(userId: string): Promise<StoredUser> {
    const raw = await this.redis.get(`user:${userId}`);
    if (!raw) throw new UnauthorizedException('User not found');
    return JSON.parse(raw) as StoredUser;
  }

  private async generateTokens(user: StoredUser): Promise<OAuthTokenResponse> {
    const jti = `${user.userId}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
    const payload = { sub: user.userId, email: user.email, role: user.role, jti };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_EXPIRES_SEC,
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshKey = AUTH_REFRESH_PREFIX + refreshToken;
    await this.redis.set(
      refreshKey,
      JSON.stringify({ userId: user.userId, email: user.email }),
      REFRESH_EXPIRES_SEC,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES_SEC,
      tokenType: 'Bearer',
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      },
    };
  }
}
