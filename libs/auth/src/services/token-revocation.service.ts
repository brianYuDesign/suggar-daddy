import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';

const BLACKLIST_PREFIX = 'auth:blacklist:';
const REVOKE_BEFORE_PREFIX = 'auth:revoke-before:';

@Injectable()
export class TokenRevocationService {
  private readonly logger = new Logger(TokenRevocationService.name);

  constructor(private readonly redis: RedisService) {}

  /** Revoke a single token by jti */
  async revokeToken(jti: string, ttlSeconds: number): Promise<void> {
    const key = BLACKLIST_PREFIX + jti;
    await this.redis.set(key, '1', ttlSeconds);
    this.logger.log(`Token revoked: jti=${jti}`);
  }

  /** Check if a single token is revoked */
  async isRevoked(jti: string): Promise<boolean> {
    const key = BLACKLIST_PREFIX + jti;
    const val = await this.redis.get(key);
    return val !== null;
  }

  /** Revoke all tokens for a user issued before now */
  async revokeAllUserTokens(userId: string, ttlSeconds: number): Promise<void> {
    const key = REVOKE_BEFORE_PREFIX + userId;
    const timestamp = Math.floor(Date.now() / 1000);
    await this.redis.set(key, String(timestamp), ttlSeconds);
    this.logger.log(`All tokens revoked for user=${userId} before=${timestamp}`);
  }

  /** Check if a user's token (by iat) was issued before the revocation timestamp */
  async isUserTokenRevoked(userId: string, iat?: number): Promise<boolean> {
    if (!iat) return false;
    const key = REVOKE_BEFORE_PREFIX + userId;
    const raw = await this.redis.get(key);
    if (!raw) return false;
    const revokedBefore = parseInt(raw, 10);
    return iat < revokedBefore;
  }
}
