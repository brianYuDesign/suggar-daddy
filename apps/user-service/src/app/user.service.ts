import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  UserProfileDto,
  CreateUserDto,
  UpdateProfileDto,
  UserCardDto,
} from '@suggar-daddy/dto';

/**
 * 架構：讀取 Redis，寫入 Kafka。不操作 DB。
 * Phase 1：in-memory mock（將由 Redis + Kafka 取代）
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
  private users: Map<string, UserRecord> = new Map();

  /** 取得用戶完整資料（自己看自己） */
  async getMe(userId: string): Promise<UserProfileDto | null> {
    const user = this.users.get(userId);
    if (!user) {
      this.logger.warn(`getMe user not found userId=${userId}`);
      return null;
    }
    this.logger.log(`getMe userId=${userId}`);
    return this.toProfileDto(user);
  }

  /** 取得用戶對外資料（給他人看，可隱藏部分欄位） */
  async getProfile(userId: string): Promise<UserProfileDto | null> {
    const user = this.users.get(userId);
    if (!user) {
      this.logger.warn(`getProfile user not found userId=${userId}`);
      return null;
    }
    this.logger.log(`getProfile userId=${userId}`);
    return this.toProfileDto(user);
  }

  /** 取得用戶卡片（供 matching 推薦用） */
  async getCard(userId: string): Promise<UserCardDto | null> {
    const user = this.users.get(userId);
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
    this.users.set(id, user);
    this.logger.log(`user created id=${id} role=${dto.role} displayName=${dto.displayName}`);
    // TODO: 發送 Kafka 事件 user.created
    return this.toProfileDto(user);
  }

  /** 更新個人資料 */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = this.users.get(userId);
    if (!user) {
      this.logger.warn(`updateProfile user not found userId=${userId}`);
      throw new NotFoundException('User not found');
    }
    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.preferences !== undefined) user.preferences = dto.preferences;
    user.lastActiveAt = new Date();
    user.updatedAt = new Date();
    this.logger.log(`profile updated userId=${userId} fields=${Object.keys(dto).join(',')}`);
    // TODO: 發送 Kafka 事件 user.profile_updated
    return this.toProfileDto(user);
  }

  /** 更新最後活躍時間（可由其他服務呼叫） */
  async touchLastActive(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastActiveAt = new Date();
    }
  }

  private toProfileDto(u: UserRecord): UserProfileDto {
    return {
      id: u.id,
      role: u.role,
      displayName: u.displayName,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      birthDate: u.birthDate,
      preferences: u.preferences,
      verificationStatus: u.verificationStatus,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'user-service' };
  }
}
