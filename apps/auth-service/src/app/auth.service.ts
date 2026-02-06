import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { USER_EVENTS } from '@suggar-daddy/common';
import type {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
} from '@suggar-daddy/dto';

const SALT_ROUNDS = 10;
const ACCESS_EXPIRES_SEC = 15 * 60; // 15 min
const REFRESH_EXPIRES_SEC = 7 * 24 * 60 * 60; // 7 days
const USER_EMAIL_PREFIX = 'user:email:';
const AUTH_REFRESH_PREFIX = 'auth:refresh:';

interface StoredUser {
  userId: string;
  email: string;
  passwordHash: string;
  role: string;
  displayName: string;
  bio?: string;
  createdAt: string;
}

interface StoredRefresh {
  userId: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const key = USER_EMAIL_PREFIX + normalizedEmail;
    const existing = await this.redis.get(key);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user: StoredUser = {
      userId,
      email: normalizedEmail,
      passwordHash,
      role: dto.role,
      displayName: dto.displayName.trim(),
      bio: dto.bio?.trim(),
      createdAt: new Date().toISOString(),
    };
    // 寫入 Redis 供登入使用（user:email -> userId, user:id -> 完整用戶）
    const userKey = `user:${userId}`;
    const emailKey = USER_EMAIL_PREFIX + normalizedEmail;
    await this.redis.set(userKey, JSON.stringify(user));
    await this.redis.set(emailKey, userId);
    this.logger.log(
      `register email=${normalizedEmail} userId=${userId} role=${dto.role}`
    );
    // 發送 Kafka 事件（DB Writer 寫入 DB 後會覆寫 Redis）
    await this.kafkaProducer.sendEvent(USER_EVENTS.USER_CREATED, {
      id: userId,
      email: normalizedEmail,
      passwordHash: user.passwordHash,
      displayName: user.displayName,
      role: user.role,
      bio: user.bio,
      createdAt: user.createdAt,
    });
    return this.issueTokens(userId, normalizedEmail);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const emailKey = USER_EMAIL_PREFIX + normalizedEmail;
    const userId = await this.redis.get(emailKey);
    if (!userId) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const userRaw = await this.redis.get(`user:${userId}`);
    if (!userRaw) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const user = JSON.parse(userRaw) as StoredUser;
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.log(`login email=${normalizedEmail} userId=${user.userId}`);
    return this.issueTokens(user.userId, user.email);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    const key = AUTH_REFRESH_PREFIX + refreshToken;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const stored = JSON.parse(raw) as StoredRefresh;
    await this.redis.del(key);
    this.logger.log(`refresh userId=${stored.userId}`);
    return this.issueTokens(stored.userId, stored.email);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const key = AUTH_REFRESH_PREFIX + refreshToken;
    const existed = (await this.redis.get(key)) !== null;
    await this.redis.del(key);
    return { success: !!existed };
  }

  private async issueTokens(
    userId: string,
    email: string
  ): Promise<TokenResponseDto> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: ACCESS_EXPIRES_SEC }
    );
    const refreshToken = this.generateRefreshToken();
    const refreshKey = AUTH_REFRESH_PREFIX + refreshToken;
    const refreshPayload: StoredRefresh = { userId, email };
    await this.redis.setex(
      refreshKey,
      REFRESH_EXPIRES_SEC,
      JSON.stringify(refreshPayload)
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_EXPIRES_SEC,
      tokenType: 'Bearer',
    };
  }

  private generateRefreshToken(): string {
    return `rt_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  }
}
