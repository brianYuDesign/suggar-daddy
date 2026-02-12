import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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

// Login rate limiting
const LOGIN_ATTEMPT_PREFIX = 'auth:login-attempts:';
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_SEC = 15 * 60; // 15 min lockout

// Email verification
const EMAIL_VERIFY_PREFIX = 'auth:email-verify:';
const EMAIL_VERIFY_TTL = 24 * 60 * 60; // 24 hours

// Password reset
const PASSWORD_RESET_PREFIX = 'auth:password-reset:';
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour

interface StoredUser {
  userId: string;
  email: string;
  passwordHash: string;
  role: string;
  displayName: string;
  bio?: string;
  accountStatus: 'active' | 'suspended' | 'banned';
  emailVerified: boolean;
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

  // ── Validation ─────────────────────────────────────────────────────

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (password.length > 128) {
      throw new BadRequestException('Password must not exceed 128 characters');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
  }

  // ── Login Rate Limiting ────────────────────────────────────────────

  private async checkLoginRateLimit(email: string): Promise<void> {
    const key = LOGIN_ATTEMPT_PREFIX + email;
    const raw = await this.redis.get(key);
    if (raw) {
      const attempts = parseInt(raw, 10);
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        throw new ForbiddenException(
          'Account temporarily locked due to too many failed login attempts. Try again in 15 minutes.'
        );
      }
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const key = LOGIN_ATTEMPT_PREFIX + email;
    const raw = await this.redis.get(key);
    const current = raw ? parseInt(raw, 10) : 0;
    await this.redis.setex(key, LOGIN_LOCKOUT_SEC, String(current + 1));
  }

  private async clearLoginAttempts(email: string): Promise<void> {
    await this.redis.del(LOGIN_ATTEMPT_PREFIX + email);
  }

  // ── Core Auth Methods ──────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    this.validateEmail(dto.email);
    this.validatePassword(dto.password);

    if (!dto.displayName || dto.displayName.trim().length < 2) {
      throw new BadRequestException('Display name must be at least 2 characters');
    }
    if (!['sugar_baby', 'sugar_daddy'].includes(dto.role)) {
      throw new BadRequestException('Role must be sugar_baby or sugar_daddy');
    }

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
      accountStatus: 'active',
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };

    const userKey = `user:${userId}`;
    const emailKey = USER_EMAIL_PREFIX + normalizedEmail;
    await this.redis.set(userKey, JSON.stringify(user));
    await this.redis.set(emailKey, userId);

    this.logger.log(`register email=${normalizedEmail} userId=${userId} role=${dto.role}`);

    await this.kafkaProducer.sendEvent(USER_EVENTS.USER_CREATED, {
      id: userId,
      email: normalizedEmail,
      displayName: user.displayName,
      role: user.role,
      bio: user.bio,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });

    // Generate email verification token
    await this.createEmailVerificationToken(userId, normalizedEmail);

    return this.issueTokens(userId, normalizedEmail, user.role);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    await this.checkLoginRateLimit(normalizedEmail);

    const emailKey = USER_EMAIL_PREFIX + normalizedEmail;
    const userId = await this.redis.get(emailKey);
    if (!userId) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    const userRaw = await this.redis.get(`user:${userId}`);
    if (!userRaw) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = JSON.parse(userRaw) as StoredUser;

    // Check account status
    if (user.accountStatus === 'banned') {
      throw new ForbiddenException('This account has been permanently banned');
    }
    if (user.accountStatus === 'suspended') {
      throw new ForbiddenException('This account is temporarily suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.clearLoginAttempts(normalizedEmail);

    this.logger.log(`login email=${normalizedEmail} userId=${user.userId}`);
    return this.issueTokens(user.userId, user.email, user.role);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    const key = AUTH_REFRESH_PREFIX + refreshToken;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const stored = JSON.parse(raw) as StoredRefresh;
    await this.redis.del(key);

    // Check account status on refresh
    const userRaw = await this.redis.get(`user:${stored.userId}`);
    if (userRaw) {
      const user = JSON.parse(userRaw) as StoredUser;
      if (user.accountStatus !== 'active') {
        throw new ForbiddenException('Account is not active');
      }
    }

    this.logger.log(`refresh userId=${stored.userId}`);
    return this.issueTokens(stored.userId, stored.email);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    const key = AUTH_REFRESH_PREFIX + refreshToken;
    const existed = (await this.redis.get(key)) !== null;
    await this.redis.del(key);
    return { success: !!existed };
  }

  // ── Email Verification ─────────────────────────────────────────────

  async createEmailVerificationToken(userId: string, email: string): Promise<string> {
    const token = `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const key = EMAIL_VERIFY_PREFIX + token;
    await this.redis.setex(key, EMAIL_VERIFY_TTL, JSON.stringify({ userId, email }));
    this.logger.log(`Email verification token created userId=${userId}`);
    // TODO: Integrate email service to send verification link
    return token;
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const key = EMAIL_VERIFY_PREFIX + token;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const { userId } = JSON.parse(raw);
    const userRaw = await this.redis.get(`user:${userId}`);
    if (!userRaw) {
      throw new BadRequestException('User not found');
    }

    const user = JSON.parse(userRaw) as StoredUser;
    user.emailVerified = true;
    await this.redis.set(`user:${userId}`, JSON.stringify(user));
    await this.redis.del(key);

    this.logger.log(`Email verified userId=${userId}`);
    return { success: true };
  }

  // ── Password Reset ─────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const normalizedEmail = email.trim().toLowerCase();
    const userId = await this.redis.get(USER_EMAIL_PREFIX + normalizedEmail);

    // Always return success to prevent email enumeration
    if (!userId) return { success: true };

    const token = `pr_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const key = PASSWORD_RESET_PREFIX + token;
    await this.redis.setex(key, PASSWORD_RESET_TTL, JSON.stringify({ userId, email: normalizedEmail }));

    this.logger.log(`Password reset token created email=${normalizedEmail}`);
    // TODO: Integrate email service to send reset link
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    this.validatePassword(newPassword);

    const key = PASSWORD_RESET_PREFIX + token;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { userId } = JSON.parse(raw);
    const userRaw = await this.redis.get(`user:${userId}`);
    if (!userRaw) {
      throw new BadRequestException('User not found');
    }

    const user = JSON.parse(userRaw) as StoredUser;
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.redis.set(`user:${userId}`, JSON.stringify(user));
    await this.redis.del(key);

    this.logger.log(`Password reset completed userId=${userId}`);
    return { success: true };
  }

  // ── Change Password (authenticated) ────────────────────────────────

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean }> {
    this.validatePassword(newPassword);

    const userRaw = await this.redis.get(`user:${userId}`);
    if (!userRaw) {
      throw new BadRequestException('User not found');
    }

    const user = JSON.parse(userRaw) as StoredUser;
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.redis.set(`user:${userId}`, JSON.stringify(user));

    this.logger.log(`Password changed userId=${userId}`);
    return { success: true };
  }

  // ── Account Status Management (Admin) ──────────────────────────────

  async suspendAccount(userId: string): Promise<{ success: boolean }> {
    return this.updateAccountStatus(userId, 'suspended');
  }

  async banAccount(userId: string): Promise<{ success: boolean }> {
    return this.updateAccountStatus(userId, 'banned');
  }

  async reactivateAccount(userId: string): Promise<{ success: boolean }> {
    return this.updateAccountStatus(userId, 'active');
  }

  private async updateAccountStatus(
    userId: string,
    status: 'active' | 'suspended' | 'banned'
  ): Promise<{ success: boolean }> {
    const userRaw = await this.redis.get(`user:${userId}`);
    if (!userRaw) {
      throw new BadRequestException('User not found');
    }

    const user = JSON.parse(userRaw) as StoredUser;
    user.accountStatus = status;
    await this.redis.set(`user:${userId}`, JSON.stringify(user));

    this.logger.log(`Account status updated userId=${userId} status=${status}`);
    return { success: true };
  }

  // ── Token Issuance ─────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    email: string,
    role?: string,
  ): Promise<TokenResponseDto> {
    const payload: Record<string, string> = { sub: userId, email };
    if (role) payload.role = role;

    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_EXPIRES_SEC });
    const refreshToken = this.generateRefreshToken();
    const refreshKey = AUTH_REFRESH_PREFIX + refreshToken;
    const refreshPayload: StoredRefresh = { userId, email };
    await this.redis.setex(refreshKey, REFRESH_EXPIRES_SEC, JSON.stringify(refreshPayload));
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
