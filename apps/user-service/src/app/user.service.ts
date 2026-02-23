import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { USER_EVENTS, SOCIAL_EVENTS, MODERATION_EVENTS, PermissionRole, InjectLogger } from '@suggar-daddy/common';
import { TextFilterService } from '@suggar-daddy/moderation';
import type {
  UserProfileDto,
  CreateUserDto,
  UpdateProfileDto,
  UserCardDto,
  LocationUpdateDto,
  FollowerDto,
  FollowCountsDto,
  FollowStatusDto,
  RecommendedCreatorDto,
} from '@suggar-daddy/dto';
import {
  type UserRecord, GEO_KEY,
  FOLLOWING_SET, FOLLOWERS_SET,
  BLOCK_SET, BLOCKED_BY_SET,
  USERS_ALL_SET, CREATORS_SET,
  USERNAME_KEY,
  PROFILE_VIEWERS, PROFILE_VIEW_DEDUP,
  VERIFICATION_KEY,
} from './user.types';

@Injectable()
export class UserService {
  @InjectLogger()
  private readonly logger!: Logger;
  private readonly USER_PREFIX = 'user:';

  constructor(
    private readonly redisService: RedisService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly textFilter: TextFilterService,
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
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      userType: user.userType,
      permissionRole: user.permissionRole,
      verificationStatus: user.verificationStatus,
      lastActiveAt: user.lastActiveAt,
      city: user.city,
    };
  }

  /** 取得指定 userId 列表的卡片（供 matching-service 地理篩選後使用） */
  async getCardsByIds(userIds: string[]): Promise<UserCardDto[]> {
    if (userIds.length === 0) return [];
    
    // ✅ 使用 MGET 批量查詢，避免 N+1 問題
    const keys = userIds.map(id => `${this.USER_PREFIX}${id}`);
    const values = await this.redisService.mget(...keys);
    
    const result: UserCardDto[] = [];
    for (let i = 0; i < values.length; i++) {
      if (!values[i]) continue;
      
      const user = JSON.parse(values[i]!) as UserRecord;
      result.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        permissionRole: user.permissionRole,
        verificationStatus: user.verificationStatus,
        lastActiveAt: user.lastActiveAt,
        city: user.city,
      });
    }

    return result;
  }

  /** 取得推薦用卡片列表（排除指定 ID + 被封鎖的用戶，供 matching-service 呼叫） */
  async getCardsForRecommendation(
    excludeIds: string[],
    limit: number,
    currentUserId?: string,
  ): Promise<UserCardDto[]> {
    // Use users:all Set instead of SCAN (O(N_members) vs O(total_keys))
    const allUserIds = await this.redisService.sMembers(USERS_ALL_SET);
    const excludeSet = new Set(excludeIds);

    // Also exclude blocked users if currentUserId is provided
    if (currentUserId) {
      const blockedIds = await this.redisService.sMembers(BLOCK_SET(currentUserId));
      const blockedByIds = await this.redisService.sMembers(BLOCKED_BY_SET(currentUserId));
      blockedIds.forEach((id) => excludeSet.add(id));
      blockedByIds.forEach((id) => excludeSet.add(id));
    }

    const userIds = allUserIds.filter((id) => !excludeSet.has(id));

    // Fetch a limited batch
    const fetchCount = Math.min(userIds.length, limit * 2);
    const userKeys = userIds.slice(0, fetchCount).map(id => `${this.USER_PREFIX}${id}`);

    if (userKeys.length === 0) return [];

    const values = await this.redisService.mget(...userKeys);

    const result: UserCardDto[] = [];
    for (let i = 0; i < values.length && result.length < limit; i++) {
      if (!values[i]) continue;

      const user = JSON.parse(values[i]!) as UserRecord;
      result.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        permissionRole: user.permissionRole,
        verificationStatus: user.verificationStatus,
        lastActiveAt: user.lastActiveAt,
        city: user.city,
      });
    }

    return result;
  }

  /** 創建用戶（註冊） */
  async create(dto: CreateUserDto): Promise<UserProfileDto> {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const user: UserRecord = {
      id,
      userType: dto.userType,
      permissionRole: PermissionRole.SUBSCRIBER, // 預設為 subscriber
      displayName: dto.displayName,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      preferences: {},
      verificationStatus: 'unverified',
      lastActiveAt: now,
      followerCount: 0,
      followingCount: 0,
      dmPrice: null,
      createdAt: now,
      updatedAt: now,
    };
    
    // 儲存到 Redis
    await this.saveUserToRedis(user);
    // Maintain user ID indexes (avoids SCAN on user:* keyspace)
    await this.redisService.sAdd(USERS_ALL_SET, id);
    // Note: creator role is now determined by permissionRole, not userType
    // Users can upgrade to creator status later
    if (user.permissionRole === PermissionRole.CREATOR) {
      await this.redisService.sAdd(CREATORS_SET, id);
    }

    this.logger.log(`user created id=${id} userType=${dto.userType} displayName=${dto.displayName}`);
    
    // 發送 Kafka 事件
    await this.kafkaProducer.sendEvent('user.created', {
      userId: id,
      userType: user.userType,
      permissionRole: user.permissionRole,
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

    // Bio moderation: block HIGH severity, async flag MEDIUM
    if (dto.bio !== undefined && dto.bio.trim().length > 0) {
      const bioFilter = this.textFilter.check(dto.bio);
      if (bioFilter.severity === 'high') {
        throw new BadRequestException(
          'Your bio contains prohibited content and cannot be saved.',
        );
      }
      if (bioFilter.severity === 'medium') {
        // Allow update but async flag for review
        this.kafkaProducer.sendEvent(MODERATION_EVENTS.CONTENT_FLAGGED, {
          contentType: 'bio',
          contentId: userId,
          creatorId: userId,
          overallSeverity: 'medium',
          textCategory: bioFilter.category,
          flaggedWords: bioFilter.flaggedWords,
          processedAt: new Date().toISOString(),
        }).catch((err) => {
          this.logger.warn('Failed to emit bio moderation flag event', err);
        });
      }
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.city !== undefined) user.city = dto.city;
    if (dto.country !== undefined) user.country = dto.country;

    if (dto.username !== undefined) {
      const normalizedUsername = dto.username.trim().toLowerCase();
      // Check uniqueness
      const existingUserId = await this.redisService.get(USERNAME_KEY(normalizedUsername));
      if (existingUserId && existingUserId !== userId) {
        throw new ConflictException('Username already taken');
      }
      // Remove old username index
      if (user.username && user.username !== normalizedUsername) {
        await this.redisService.del(USERNAME_KEY(user.username));
      }
      // Set new username index
      await this.redisService.set(USERNAME_KEY(normalizedUsername), userId);
      user.username = normalizedUsername;
    }

    // Diamond chat gate settings
    if (dto.chatDiamondGateEnabled !== undefined) user.chatDiamondGateEnabled = dto.chatDiamondGateEnabled;
    if (dto.chatDiamondThreshold !== undefined) user.chatDiamondThreshold = dto.chatDiamondThreshold;
    if (dto.chatDiamondCost !== undefined) user.chatDiamondCost = dto.chatDiamondCost;

    // 位置更新：同步寫入 Redis GEO
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      user.latitude = dto.latitude;
      user.longitude = dto.longitude;
      user.locationUpdatedAt = new Date();
      await this.redisService.geoAdd(GEO_KEY, dto.longitude, dto.latitude, userId);
      this.logger.log(`user location updated via profile userId=${userId} lat=${dto.latitude} lng=${dto.longitude}`);
    }

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

  /** 更新用戶位置（專用端點，供前端定期 GPS 更新） */
  async updateLocation(userId: string, dto: LocationUpdateDto): Promise<{ success: boolean }> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    user.latitude = dto.latitude;
    user.longitude = dto.longitude;
    if (dto.city !== undefined) user.city = dto.city;
    if (dto.country !== undefined) user.country = dto.country;
    user.locationUpdatedAt = new Date();
    user.updatedAt = new Date();

    // 同步寫入 Redis GEO
    await this.redisService.geoAdd(GEO_KEY, dto.longitude, dto.latitude, userId);
    await this.saveUserToRedis(user);

    this.logger.log(`user location updated userId=${userId} lat=${dto.latitude} lng=${dto.longitude}`);

    // 發送 Kafka 事件
    await this.kafkaProducer.sendEvent('user.updated', {
      userId: user.id,
      latitude: dto.latitude,
      longitude: dto.longitude,
      city: dto.city,
      country: dto.country,
      updatedAt: user.updatedAt.toISOString(),
    });

    return { success: true };
  }

  // ── Follow / Unfollow ───────────────────────────────────────────

  async follow(followerId: string, targetId: string): Promise<{ success: boolean }> {
    if (followerId === targetId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    const target = await this.getUserFromRedis(targetId);
    if (!target) {
      throw new NotFoundException(`User not found: ${targetId}`);
    }

    // Check if blocked
    const blocked = await this.redisService.sIsMember(BLOCK_SET(targetId), followerId);
    const blockedBy = await this.redisService.sIsMember(BLOCK_SET(followerId), targetId);
    if (blocked || blockedBy) {
      throw new BadRequestException('Cannot follow this user');
    }

    const added = await this.redisService.sAdd(FOLLOWING_SET(followerId), targetId);
    if (added === 0) {
      throw new ConflictException('Already following this user');
    }
    await this.redisService.sAdd(FOLLOWERS_SET(targetId), followerId);

    // Update counters in user JSON
    const follower = await this.getUserFromRedis(followerId);
    if (follower) {
      follower.followingCount = await this.redisService.sCard(FOLLOWING_SET(followerId));
      follower.updatedAt = new Date();
      await this.saveUserToRedis(follower);
    }
    target.followerCount = await this.redisService.sCard(FOLLOWERS_SET(targetId));
    target.updatedAt = new Date();
    await this.saveUserToRedis(target);

    this.logger.log(`user followed follower=${followerId} target=${targetId}`);
    await this.kafkaProducer.sendEvent(SOCIAL_EVENTS.USER_FOLLOWED, {
      followerId,
      followedId: targetId,
      followedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  async unfollow(followerId: string, targetId: string): Promise<{ success: boolean }> {
    const removed = await this.redisService.sRem(FOLLOWING_SET(followerId), targetId);
    if (removed === 0) {
      throw new BadRequestException('Not following this user');
    }
    await this.redisService.sRem(FOLLOWERS_SET(targetId), followerId);

    // Update counters in user JSON
    const follower = await this.getUserFromRedis(followerId);
    if (follower) {
      follower.followingCount = await this.redisService.sCard(FOLLOWING_SET(followerId));
      follower.updatedAt = new Date();
      await this.saveUserToRedis(follower);
    }
    const target = await this.getUserFromRedis(targetId);
    if (target) {
      target.followerCount = await this.redisService.sCard(FOLLOWERS_SET(targetId));
      target.updatedAt = new Date();
      await this.saveUserToRedis(target);
    }

    this.logger.log(`user unfollowed follower=${followerId} target=${targetId}`);
    await this.kafkaProducer.sendEvent(SOCIAL_EVENTS.USER_UNFOLLOWED, {
      followerId,
      followedId: targetId,
      unfollowedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  async getFollowers(userId: string, page = 1, limit = 20): Promise<{ data: FollowerDto[]; total: number }> {
    const followerIds = await this.redisService.sMembers(FOLLOWERS_SET(userId));
    const total = followerIds.length;
    const start = (page - 1) * limit;
    const pageIds = followerIds.slice(start, start + limit);

    if (pageIds.length === 0) return { data: [], total };

    // ✅ 使用 MGET 批量查詢，避免 N+1 問題
    const keys = pageIds.map(id => `${this.USER_PREFIX}${id}`);
    const values = await this.redisService.mget(...keys);

    const data: FollowerDto[] = [];
    for (const value of values) {
      if (!value) continue;

      const user = JSON.parse(value) as UserRecord;
      data.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        permissionRole: user.permissionRole,
      });
    }

    return { data, total };
  }

  async getFollowing(userId: string, page = 1, limit = 20): Promise<{ data: FollowerDto[]; total: number }> {
    const followingIds = await this.redisService.sMembers(FOLLOWING_SET(userId));
    const total = followingIds.length;
    const start = (page - 1) * limit;
    const pageIds = followingIds.slice(start, start + limit);

    if (pageIds.length === 0) return { data: [], total };

    // ✅ 使用 MGET 批量查詢，避免 N+1 問題
    const keys = pageIds.map(id => `${this.USER_PREFIX}${id}`);
    const values = await this.redisService.mget(...keys);

    const data: FollowerDto[] = [];
    for (const value of values) {
      if (!value) continue;

      const user = JSON.parse(value) as UserRecord;
      data.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        userType: user.userType,
        permissionRole: user.permissionRole,
      });
    }

    return { data, total };
  }

  async getFollowStatus(followerId: string, targetId: string): Promise<FollowStatusDto> {
    const isFollowing = await this.redisService.sIsMember(FOLLOWING_SET(followerId), targetId);
    return { isFollowing };
  }

  async getFollowCounts(userId: string): Promise<FollowCountsDto> {
    const [followerCount, followingCount] = await Promise.all([
      this.redisService.sCard(FOLLOWERS_SET(userId)),
      this.redisService.sCard(FOLLOWING_SET(userId)),
    ]);
    return { followerCount, followingCount };
  }

  // ── DM Price ──────────────────────────────────────────────────

  async setDmPrice(userId: string, price: number | null): Promise<{ success: boolean; dmPrice: number | null }> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    if (price !== null && price < 0) {
      throw new BadRequestException('DM price must be non-negative');
    }

    user.dmPrice = price;
    user.updatedAt = new Date();
    await this.saveUserToRedis(user);

    this.logger.log(`dm price updated userId=${userId} price=${price}`);
    await this.kafkaProducer.sendEvent('user.dm_price.updated', {
      userId,
      dmPrice: price,
      updatedAt: user.updatedAt.toISOString(),
    });
    return { success: true, dmPrice: price };
  }

  // ── Discovery: Recommended Creators & Search ──────────────────

  async getRecommendedCreators(userId: string, limit = 10): Promise<RecommendedCreatorDto[]> {
    // Use creators:set instead of SCAN (only creator IDs, not all keys)
    const creatorIds = await this.redisService.sMembers(CREATORS_SET);

    // Get users the requester already follows + blocked users
    const [followingIds, blockedIds, blockedByIds] = await Promise.all([
      this.redisService.sMembers(FOLLOWING_SET(userId)),
      this.redisService.sMembers(BLOCK_SET(userId)),
      this.redisService.sMembers(BLOCKED_BY_SET(userId)),
    ]);
    const excludeSet = new Set([userId, ...followingIds, ...blockedIds, ...blockedByIds]);

    const candidateIds = creatorIds.filter(id => !excludeSet.has(id));

    if (candidateIds.length === 0) return [];

    const userKeys = candidateIds.map(id => `${this.USER_PREFIX}${id}`);
    const values = await this.redisService.mget(...userKeys);

    const creators: RecommendedCreatorDto[] = [];
    for (const value of values) {
      if (!value) continue;

      const user = JSON.parse(value) as UserRecord;
      creators.push({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        followerCount: user.followerCount ?? 0,
        userType: user.userType,
        permissionRole: user.permissionRole,
      });
    }

    // Sort by followerCount descending
    creators.sort((a, b) => b.followerCount - a.followerCount);
    return creators.slice(0, limit);
  }

  async searchUsers(query: string, limit = 20): Promise<FollowerDto[]> {
    if (!query || query.trim().length === 0) return [];
    const lowerQuery = query.toLowerCase();
    
    // ✅ 優化: 使用 SSCAN 分頁，避免載入所有用戶到記憶體
    const results: FollowerDto[] = [];
    let cursor = 0;
    let scannedCount = 0;
    const MAX_SCAN_LIMIT = 1000; // 最多掃描 1000 個用戶
    const SCAN_COUNT = 100; // 每次掃描 100 個用戶
    
    do {
      // 使用 SSCAN 分批掃描
      const scanResult = await this.redisService.getClient().sscan(
        USERS_ALL_SET,
        cursor,
        'COUNT',
        SCAN_COUNT
      );
      
      cursor = parseInt(scanResult[0], 10);
      const userIds = scanResult[1];
      
      if (userIds.length === 0) break;
      
      // 批量獲取這批用戶數據
      const userKeys = userIds.map(id => `${this.USER_PREFIX}${id}`);
      const values = await this.redisService.mget(...userKeys);
      
      // 過濾匹配的用戶
      for (const value of values) {
        if (!value) continue;
        if (results.length >= limit) break;
        
        const user = JSON.parse(value) as UserRecord;
        // 搜尋 displayName 或 username
        if (user.displayName.toLowerCase().includes(lowerQuery) ||
            (user.username && user.username.toLowerCase().includes(lowerQuery))) {
          results.push({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            userType: user.userType,
            permissionRole: user.permissionRole,
          });
        }
      }
      
      scannedCount += userIds.length;
      
      // 如果已找到足夠的結果或掃描超過限制，停止
      if (results.length >= limit || scannedCount >= MAX_SCAN_LIMIT) {
        break;
      }
      
    } while (cursor !== 0);
    
    return results;
  }

  /** 透過 username 查詢用戶 */
  async findByUsername(username: string): Promise<UserProfileDto | null> {
    const normalizedUsername = username.trim().toLowerCase();
    const userId = await this.redisService.get(USERNAME_KEY(normalizedUsername));
    if (!userId) return null;
    return this.getProfile(userId);
  }

  // ── Block / Unblock ──────────────────────────────────────────────

  async blockUser(blockerId: string, targetId: string): Promise<{ success: boolean }> {
    if (blockerId === targetId) {
      throw new BadRequestException('Cannot block yourself');
    }
    const target = await this.getUserFromRedis(targetId);
    if (!target) {
      throw new NotFoundException(`User not found: ${targetId}`);
    }

    const added = await this.redisService.sAdd(BLOCK_SET(blockerId), targetId);
    if (added === 0) {
      throw new ConflictException('User already blocked');
    }
    await this.redisService.sAdd(BLOCKED_BY_SET(targetId), blockerId);

    this.logger.log(`user blocked blocker=${blockerId} target=${targetId}`);
    await this.kafkaProducer.sendEvent(USER_EVENTS.USER_BLOCKED, {
      blockerId,
      targetId,
      blockedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  async unblockUser(blockerId: string, targetId: string): Promise<{ success: boolean }> {
    await this.redisService.sRem(BLOCK_SET(blockerId), targetId);
    await this.redisService.sRem(BLOCKED_BY_SET(targetId), blockerId);

    this.logger.log(`user unblocked blocker=${blockerId} target=${targetId}`);
    await this.kafkaProducer.sendEvent(USER_EVENTS.USER_UNBLOCKED, {
      blockerId,
      targetId,
      unblockedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    return this.redisService.sMembers(BLOCK_SET(userId));
  }

  async isBlocked(blockerId: string, targetId: string): Promise<boolean> {
    const blockedIds = await this.redisService.sMembers(BLOCK_SET(blockerId));
    return blockedIds.includes(targetId);
  }

  // ── Profile Views ──────────────────────────────────────────────

  async recordProfileView(viewedUserId: string, viewerId: string): Promise<void> {
    if (viewedUserId === viewerId) return;

    // Dedup: same viewer within 1 hour
    const dedupKey = PROFILE_VIEW_DEDUP(viewedUserId, viewerId);
    const already = await this.redisService.get(dedupKey);
    if (already) return;

    // Set dedup key with 1h TTL
    await this.redisService.set(dedupKey, '1', 3600);

    // Add to sorted set (score = timestamp)
    const now = Date.now();
    const client = this.redisService.getClient();
    await client.zadd(PROFILE_VIEWERS(viewedUserId), now, viewerId);

    this.logger.log(`profile view recorded viewed=${viewedUserId} viewer=${viewerId}`);

    // Emit Kafka event
    await this.kafkaProducer.sendEvent(USER_EVENTS.PROFILE_VIEWED, {
      viewedUserId,
      viewerId,
      viewedAt: new Date(now).toISOString(),
    });
  }

  async getProfileViewers(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ viewers: { id: string; displayName: string; avatarUrl?: string; userType: string; viewedAt: number }[]; total: number }> {
    const client = this.redisService.getClient();
    const total = await client.zcard(PROFILE_VIEWERS(userId));

    const start = (page - 1) * limit;
    const stop = start + limit - 1;
    // Get viewer IDs with scores (timestamps), newest first
    const results = await client.zrevrange(PROFILE_VIEWERS(userId), start, stop, 'WITHSCORES');

    const viewers: { id: string; displayName: string; avatarUrl?: string; userType: string; viewedAt: number }[] = [];
    // results is [id, score, id, score, ...]
    for (let i = 0; i < results.length; i += 2) {
      const viewerId = results[i];
      const viewedAt = parseInt(results[i + 1], 10);
      const user = await this.getUserFromRedis(viewerId);
      if (user) {
        viewers.push({
          id: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          userType: user.userType,
          viewedAt,
        });
      }
    }

    return { viewers, total };
  }

  async getProfileViewCount(userId: string): Promise<number> {
    const client = this.redisService.getClient();
    return client.zcard(PROFILE_VIEWERS(userId));
  }

  // ── Verification ──────────────────────────────────────────────

  async submitVerification(userId: string, selfieUrl: string): Promise<{ requestId: string; status: string }> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    if (user.verificationStatus === 'pending') {
      throw new BadRequestException('A verification request is already pending');
    }
    if (user.verificationStatus === 'approved') {
      throw new BadRequestException('User is already verified');
    }

    const requestId = `vr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    // Store in Redis
    const verificationRecord = {
      id: requestId,
      userId,
      selfieUrl,
      status: 'pending',
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now.toISOString(),
    };
    await this.redisService.set(VERIFICATION_KEY(userId), JSON.stringify(verificationRecord));

    // Update user verification status
    user.verificationStatus = 'pending';
    user.updatedAt = now;
    await this.saveUserToRedis(user);

    this.logger.log(`verification submitted userId=${userId} requestId=${requestId}`);

    // Emit Kafka event
    await this.kafkaProducer.sendEvent(USER_EVENTS.VERIFICATION_SUBMITTED, {
      requestId,
      userId,
      selfieUrl,
      submittedAt: now.toISOString(),
    });

    return { requestId, status: 'pending' };
  }

  async getVerificationStatus(userId: string): Promise<{ status: string; rejectionReason?: string }> {
    const user = await this.getUserFromRedis(userId);
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    const raw = await this.redisService.get(VERIFICATION_KEY(userId));
    if (raw) {
      const record = JSON.parse(raw);
      return {
        status: record.status || user.verificationStatus,
        rejectionReason: record.rejectionReason || undefined,
      };
    }

    return { status: user.verificationStatus };
  }

  // ── Admin: Verification Review ──────────────────────────────────

  async getPendingVerifications(page = 1, limit = 20): Promise<{ data: Record<string, unknown>[]; total: number }> {
    // Scan for all verification keys
    const client = this.redisService.getClient();
    const results: Record<string, unknown>[] = [];
    let cursor = 0;

    do {
      const scanResult = await client.scan(cursor, 'MATCH', 'verification:*', 'COUNT', 100);
      cursor = parseInt(scanResult[0], 10);
      const keys = scanResult[1];

      if (keys.length > 0) {
        const values = await this.redisService.mget(...keys);
        for (const val of values) {
          if (!val) continue;
          const record = JSON.parse(val);
          results.push(record);
        }
      }
    } while (cursor !== 0);

    // Filter by status if needed, sort by createdAt desc
    const filtered = results.sort((a, b) =>
      new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );

    const total = filtered.length;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    // Enrich with user info
    const enriched = await Promise.all(
      paged.map(async (record) => {
        const user = await this.getUserFromRedis(record.userId as string);
        return {
          ...record,
          userDisplayName: user?.displayName,
          userAvatarUrl: user?.avatarUrl,
        };
      })
    );

    return { data: enriched, total };
  }

  async reviewVerification(
    userId: string,
    action: 'approve' | 'reject',
    reviewedBy: string,
    reason?: string,
  ): Promise<void> {
    const raw = await this.redisService.get(VERIFICATION_KEY(userId));
    if (!raw) {
      throw new NotFoundException('Verification request not found');
    }

    const record = JSON.parse(raw);
    const now = new Date();

    record.status = action === 'approve' ? 'approved' : 'rejected';
    record.reviewedBy = reviewedBy;
    record.reviewedAt = now.toISOString();
    if (action === 'reject' && reason) {
      record.rejectionReason = reason;
    }

    await this.redisService.set(VERIFICATION_KEY(userId), JSON.stringify(record));

    // Update user verification status
    const user = await this.getUserFromRedis(userId);
    if (user) {
      user.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
      user.updatedAt = now;
      await this.saveUserToRedis(user);
    }

    this.logger.log(`verification ${action} userId=${userId} by=${reviewedBy}`);

    // Emit Kafka event
    const eventTopic = action === 'approve'
      ? USER_EVENTS.VERIFICATION_APPROVED
      : USER_EVENTS.VERIFICATION_REJECTED;

    await this.kafkaProducer.sendEvent(eventTopic, {
      requestId: record.id,
      userId,
      action,
      reason: reason || null,
      reviewedBy,
      reviewedAt: now.toISOString(),
    });
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
      username: user.username,
      userType: user.userType,
      permissionRole: user.permissionRole,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      preferences: user.preferences,
      verificationStatus: user.verificationStatus,
      lastActiveAt: user.lastActiveAt,
      city: user.city,
      country: user.country,
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
