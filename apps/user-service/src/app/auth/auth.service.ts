import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { USER_EVENTS } from '@suggar-daddy/common';
import { JwtPayload } from '@suggar-daddy/common';
import * as bcrypt from 'bcrypt';

const USER_KEY = (id: string) => `user:${id}`;
const USER_EMAIL_KEY = (email: string) => `user:email:${email}`;

interface StoredUser {
  userId: string;
  id?: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: string;
  bio?: string;
  createdAt: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, displayName: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.redis.get(USER_EMAIL_KEY(normalizedEmail));
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const user: StoredUser = {
      userId: id,
      id,
      email: normalizedEmail,
      passwordHash,
      displayName,
      role: 'subscriber',
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(USER_KEY(id), JSON.stringify(user));
    await this.redis.set(USER_EMAIL_KEY(normalizedEmail), id);
    await this.kafkaProducer.sendEvent(USER_EVENTS.USER_CREATED, {
      id,
      email: normalizedEmail,
      passwordHash,
      displayName,
      role: user.role,
      createdAt: user.createdAt,
    });
    return this.generateToken({ id, email: normalizedEmail, role: user.role, displayName });
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const userId = await this.redis.get(USER_EMAIL_KEY(normalizedEmail));
    if (!userId) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const raw = await this.redis.get(USER_KEY(userId));
    if (!raw) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = JSON.parse(raw) as StoredUser;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateToken({
      id: user.userId || user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    });
  }

  async validateUser(userId: string): Promise<{ id: string; email: string; role: string; displayName: string }> {
    const raw = await this.redis.get(USER_KEY(userId));
    if (!raw) {
      throw new UnauthorizedException('User not found');
    }
    const user = JSON.parse(raw) as StoredUser;
    return {
      id: user.userId || user.id!,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    };
  }

  private generateToken(user: { id: string; email: string; role: string; displayName: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }
}
