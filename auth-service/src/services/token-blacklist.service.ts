import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklist } from '@/entities';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @InjectRepository(TokenBlacklist)
    private tokenBlacklistRepository: Repository<TokenBlacklist>,
    private configService: ConfigService,
  ) {}

  /**
   * Add token to blacklist
   */
  async addToBlacklist(
    token: string,
    userId: string,
    tokenType: string,
    expiresAt: Date,
  ): Promise<void> {
    const blacklistEntry = this.tokenBlacklistRepository.create({
      token,
      userId,
      tokenType,
      expiresAt,
    });

    await this.tokenBlacklistRepository.save(blacklistEntry);
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const entry = await this.tokenBlacklistRepository.findOne({
      where: { token },
    });

    return !!entry;
  }

  /**
   * Clean up expired tokens from blacklist (runs daily)
   */
  @Cron('0 0 * * *') // Daily at midnight
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();
    await this.tokenBlacklistRepository.delete({
      expiresAt: LessThan(now),
    });
  }

  /**
   * Remove token from blacklist (for testing/specific cases)
   */
  async removeFromBlacklist(token: string): Promise<void> {
    await this.tokenBlacklistRepository.delete({ token });
  }

  /**
   * Get blacklist entries for user
   */
  async getUserBlacklistedTokens(userId: string): Promise<TokenBlacklist[]> {
    return this.tokenBlacklistRepository.find({
      where: { userId },
    });
  }
}
