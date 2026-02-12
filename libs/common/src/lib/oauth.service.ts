import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { USER_EVENTS } from '@suggar-daddy/common';
import type { OAuthUser } from './oauth-google.strategy';
import type { TokenResponseDto as BaseTokenResponseDto } from '@suggar-daddy/dto';

interface OAuthTokenResponse extends BaseTokenResponseDto {
  user: {
    userId: string;
    email: string;
    role: string;
    displayName: string;
  };
}
import * as crypto from 'crypto';

const USER_EMAIL_PREFIX = 'user:email:';
const USER_OAUTH_PREFIX = 'user:oauth:';
const AUTH_REFRESH_PREFIX = 'auth:refresh:';
const REFRESH_EXPIRES_SEC = 7 * 24 * 60 * 60; // 7 days
const ACCESS_EXPIRES_SEC = 15 * 60; // 15 min

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
  // OAuth specific
  oauthProvider?: 'google' | 'apple';
  oauthProviderId?: string;
  photoUrl?: string;
}

/**
 * OAuth 登入服務
 * 
 * 功能:
 * 1. 處理 Google/Apple OAuth 登入流程
 * 2. 自動註冊新用戶（如果不存在）
 * 3. 綁定 OAuth 帳號到現有用戶
 * 4. 生成 JWT tokens
 * 5. 發送 Kafka 事件
 * 
 * 工作流程:
 * 1. 檢查是否已有對應的 OAuth 帳號
 * 2. 如果沒有，檢查 email 是否已存在
 * 3. 如果 email 存在，綁定 OAuth（需要用戶同意）
 * 4. 如果都不存在，創建新用戶
 * 5. 生成並返回 tokens
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * 處理 OAuth 登入
   * 
   * 自動處理三種情況:
   * 1. OAuth 帳號已存在 -> 直接登入
   * 2. Email 已存在但未綁定 OAuth -> 綁定並登入
   * 3. 完全新用戶 -> 創建並登入
   */
  async handleOAuthLogin(oauthUser: OAuthUser): Promise<OAuthTokenResponse> {
    this.logger.log(
      `OAuth login attempt: provider=${oauthUser.provider}, email=${oauthUser.email}`,
    );

    // 1. 檢查是否已有對應的 OAuth 帳號
    const oauthKey = `${USER_OAUTH_PREFIX}${oauthUser.provider}:${oauthUser.providerId}`;
    const existingUserIdByOAuth = await this.redis.get(oauthKey);

    if (existingUserIdByOAuth) {
      // OAuth 帳號已存在，直接登入
      const user = await this.getUserById(existingUserIdByOAuth);
      this.logger.log(`Existing OAuth user found: userId=${user.userId}`);
      return this.generateTokens(user);
    }

    // 2. 檢查 email 是否已存在
    const emailKey = USER_EMAIL_PREFIX + oauthUser.email.toLowerCase();
    const existingUserIdByEmail = await this.redis.get(emailKey);

    if (existingUserIdByEmail) {
      // Email 已存在，綁定 OAuth 帳號
      const user = await this.getUserById(existingUserIdByEmail);
      await this.linkOAuthAccount(user.userId, oauthUser);
      this.logger.log(
        `OAuth linked to existing email: userId=${user.userId}, provider=${oauthUser.provider}`,
      );
      return this.generateTokens(user);
    }

    // 3. 完全新用戶，創建帳號
    return this.createOAuthUser(oauthUser);
  }

  /**
   * 創建新的 OAuth 用戶
   */
  private async createOAuthUser(oauthUser: OAuthUser): Promise<OAuthTokenResponse> {
    const userId = crypto.randomUUID();
    const emailKey = USER_EMAIL_PREFIX + oauthUser.email.toLowerCase();
    const oauthKey = `${USER_OAUTH_PREFIX}${oauthUser.provider}:${oauthUser.providerId}`;

    const newUser: StoredUser = {
      userId,
      email: oauthUser.email.toLowerCase(),
      role: 'basic',
      displayName: oauthUser.displayName || oauthUser.email.split('@')[0],
      accountStatus: 'active',
      emailVerified: oauthUser.emailVerified,
      createdAt: new Date().toISOString(),
      oauthProvider: oauthUser.provider,
      oauthProviderId: oauthUser.providerId,
      photoUrl: oauthUser.photoUrl,
    };

    // 存儲到 Redis (email mapping)
    await this.redis.set(emailKey, userId, 365 * 24 * 60 * 60); // 1 year

    // 存儲 OAuth mapping
    await this.redis.set(oauthKey, userId, 365 * 24 * 60 * 60); // 1 year

    // 發送 Kafka 事件 (寫入 DB)
    await this.kafkaProducer.send(USER_EVENTS.USER_CREATED, [
      {
        key: userId,
        value: JSON.stringify({
          userId,
          email: newUser.email,
          displayName: newUser.displayName,
          role: newUser.role,
          accountStatus: newUser.accountStatus,
          emailVerified: newUser.emailVerified,
          oauthProvider: newUser.oauthProvider,
          oauthProviderId: newUser.oauthProviderId,
          photoUrl: newUser.photoUrl,
          registeredAt: newUser.createdAt,
        }),
      },
    ]);

    this.logger.log(
      `New OAuth user created: userId=${userId}, provider=${oauthUser.provider}, email=${oauthUser.email}`,
    );

    return this.generateTokens(newUser);
  }

  /**
   * 綁定 OAuth 帳號到現有用戶
   */
  private async linkOAuthAccount(userId: string, oauthUser: OAuthUser): Promise<void> {
    const oauthKey = `${USER_OAUTH_PREFIX}${oauthUser.provider}:${oauthUser.providerId}`;
    await this.redis.set(oauthKey, userId, 365 * 24 * 60 * 60); // 1 year

    // 發送 Kafka 事件（更新 DB）
    await this.kafkaProducer.send(USER_EVENTS.USER_UPDATED, [
      {
        key: userId,
        value: JSON.stringify({
          userId,
          oauthProvider: oauthUser.provider,
          oauthProviderId: oauthUser.providerId,
          photoUrl: oauthUser.photoUrl,
          updatedAt: new Date().toISOString(),
        }),
      },
    ]);

    this.logger.log(`OAuth account linked: userId=${userId}, provider=${oauthUser.provider}`);
  }

  /**
   * 根據 userId 獲取用戶資料
   */
  private async getUserById(userId: string): Promise<StoredUser> {
    // 這裡簡化處理，實際應該從 Redis 獲取完整用戶資料
    // 或者從 user-service 調用 API
    const emailKey = USER_EMAIL_PREFIX + '*'; // 這裡需要更好的實現
    // TODO: 實作更好的 user lookup 邏輯
    throw new Error('getUserById not fully implemented');
  }

  /**
   * 生成 Access Token 和 Refresh Token
   */
  private async generateTokens(user: StoredUser): Promise<OAuthTokenResponse> {
    const payload = { sub: user.userId, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_EXPIRES_SEC,
    });

    const refreshToken = crypto.randomBytes(32).toString('hex');

    // 存儲 refresh token
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
