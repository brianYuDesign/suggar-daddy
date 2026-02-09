import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import type {
  UserProfileDto,
  CreateUserDto,
  UpdateProfileDto,
  UserCardDto,
} from '@suggar-daddy/dto';

/**
 * 整合 Redis 和 Kafka
 * Phase 1：使用 Redis 儲存用戶資料，Kafka 發送事件
 */
interface UserRecord {
  id: string;
  role: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: Date;
  preferences: Record<string, unknown>;
  verificationStatus: string;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly USER_PREFIX = 'user:';

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /** 取得用戶完整資料（自己看自己） */
  async getMe(userId: string): Promise<UserProfileDto | null> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      this.logger.warn(`getMe user not found userId=${userId}`);
      return null;
    }
    this.logger.log(`getMe userId=${userId}`);
    return this.toProfileDto(user);
  }

  /** 取得用戶公開資料（給別人看，可隱藏部分敏感位置） */
  async getProfile(userId: string): Promise<UserProfileDto | null> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      this.logger.warn(`getProfile user not found userId=${userId}`);
      return null;
    }
    this.logger.log(`getProfile userId=${userId}`);
    return this.toProfileDto(user);
  }

  /** 取得用戶卡片（供 matching 推薦用） */
  async getCard(userId: string): Promise<UserCardDto | null> {
    const user = await this.getUserFromRedis(userId);
    if (!user) return null;
    return {
      id: user.id,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      role: user.role,
      verificationStatus: user.verificationStatus,
      lastActiveAt: user.lastActiveAt,
    };
  }

  /** 取得推薦用卡片列表（排除指定 ID，供 matching-service 呼叫） */
  async getCardsForRecommendation(
    excludeIds: string[],
    limit: number
  ): Promise<UserCardDto[]> {
    const keys = await this.redisService.keys(`${this.USER_PREFIX}*`);
    const excludeSet = new Set(excludeIds);
    const userIds = keys
      .map((k) => k.replace(this.USER_PREFIX, ''))
      .filter((id) => id && !excludeSet.has(id));
    const result: UserCardDto[] = [];
    for (let i = 0; i < userIds.length && result.length < limit; i++) {
      const card = await this.getCard(userIds[i]);
      if (card) result.push(card);
    }
    return result;
  }

  /** 創建用戶（註冊） */
  async create(dto: CreateUserDto): Promise<UserProfileDto> {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const user: UserRecord = {
      id,
      role: dto.role,
      displayName: dto.displayName,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      preferences: {},
      verificationStatus: 'unverified',
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };
    
    // 儲存到 Redis
    await this.saveUserToRedis(user);
    
    this.logger.log(`user created id=${id} role=${dto.role} displayName=${dto.displayName}`);
    
    // 發送 Kafka 事件
    await this.kafkaProducer.sendEvent('user.created', {
      userId: id,
      role: user.role,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    });
    
    return this.toProfileDto(user);
  }

  /** 更新個人資料 */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      this.logger.warn(`updateProfile user not found userId=${userId}`);
      throw new NotFoundException(`User not found: ${userId}`);
    }
    
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    user.updatedAt = new Date();
    
    // 更新到 Redis
    await this.saveUserToRedis(user);
    
    this.logger.log(`user profile updated userId=${userId}`);
    
    // 發送 Kafka 事件
    await this.kafkaProducer.sendEvent('user.updated', {
      userId: user.id,
      displayName: user.displayName,
      updatedAt: user.updatedAt.toISOString(),
    });
    
    return this.toProfileDto(user);
  }

  /** 從 Redis 取得用戶 */
  private async getUserFromRedis(userId: string): Promise<UserRecord | null> {
    const key = `${this.USER_PREFIX}${userId}`;
    const data = await this.redisService.get(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      birthDate: parsed.birthDate ? new Date(parsed.birthDate) : undefined,
      lastActiveAt: new Date(parsed.lastActiveAt),
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  }

  /** 儲存用戶到 Redis */
  private async saveUserToRedis(user: UserRecord): Promise<void> {
    const key = `${this.USER_PREFIX}${user.id}`;
    await this.redisService.set(key, JSON.stringify(user));
  }

  private toProfileDto(user: UserRecord): UserProfileDto {
    return {
      id: user.id,
      role: user.role,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      preferences: user.preferences,
      verificationStatus: user.verificationStatus,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
