/**
 * 用戶管理服務
 * 提供用戶列表查詢、詳情查看、停用/啟用、統計等功能
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserEntity,
  PostEntity,
  SubscriptionEntity,
  TransactionEntity,
  PermissionRole,
} from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 分頁查詢用戶列表
   * @param page 頁碼（從 1 開始）
   * @param limit 每頁數量
   * @param role 篩選角色（可選）
   * @param status 篩選狀態（可選）
   */
  async listUsers(
    page: number,
    limit: number,
    role?: string,
    status?: string,
    search?: string,
  ) {
    const qb = this.userRepo.createQueryBuilder('user');

    // 搜尋（依名稱或 email 模糊匹配）
    if (search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 依角色篩選
    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    // 依狀態篩選（透過 Redis 標記判斷是否停用）
    if (status === 'disabled') {
      const disabledKeys = await this.getDisabledUserIds();
      if (disabledKeys.length > 0) {
        qb.andWhere('user.id IN (:...ids)', { ids: disabledKeys });
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    // 排序與分頁
    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const sanitized = data.map((u) => this.sanitizeUser(u));

    return { data: sanitized, total, page, limit };
  }

  /** 取得單一用戶詳細資料 */
  async getUserDetail(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    const isDisabled = await this.redisService.get('user:disabled:' + userId);

    return {
      ...this.sanitizeUser(user),
      isDisabled: !!isDisabled,
    };
  }

  /** 停用用戶帳號，在 Redis 標記停用狀態 */
  async disableUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    await this.redisService.set('user:disabled:' + userId, 'true');

    this.logger.warn('用戶已停用: ' + userId + ' (' + user.email + ')');
    return { success: true, message: '用戶 ' + userId + ' 已停用' };
  }

  /** 重新啟用用戶帳號 */
  async enableUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    await this.redisService.del('user:disabled:' + userId);

    this.logger.log('用戶已啟用: ' + userId + ' (' + user.email + ')');
    return { success: true, message: '用戶 ' + userId + ' 已重新啟用' };
  }

  /** 取得用戶統計資料 */
  async getUserStats() {
    const totalUsers = await this.userRepo.count();

    const roleCounts = await this.userRepo
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // 本週新增用戶（過去 7 天）
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newUsersThisWeek = await this.userRepo
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: oneWeekAgo })
      .getCount();

    // 本月新增用戶（過去 30 天）
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const newUsersThisMonth = await this.userRepo
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: oneMonthAgo })
      .getCount();

    return {
      totalUsers,
      byRole: roleCounts.reduce(
        (acc, r) => ({ ...acc, [r.role]: parseInt(r.count, 10) }),
        {},
      ),
      newUsersThisWeek,
      newUsersThisMonth,
    };
  }

  /** 變更用戶角色 */
  async changeUserRole(userId: string, newRole: string) {
    const validRoles = ['admin', 'creator', 'subscriber', 'super_admin'];
    const normalizedRole = newRole.toLowerCase();
    if (!validRoles.includes(normalizedRole)) {
      throw new BadRequestException('無效的角色: ' + newRole);
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }
    const oldPermissionRole = user.permissionRole;
    user.permissionRole = normalizedRole as PermissionRole;
    user.role = normalizedRole;
    await this.userRepo.save(user);
    this.logger.warn(`用戶角色變更: ${userId} ${oldPermissionRole} -> ${normalizedRole}`);
    return { success: true, message: `角色已從 ${oldPermissionRole} 變更為 ${normalizedRole}` };
  }

  /** 編輯用戶資料（超級管理員專用） */
  async updateUser(userId: string, updateData: {
    displayName?: string;
    email?: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
    userType?: string;
    permissionRole?: string;
    city?: string;
    country?: string;
    dmPrice?: number;
    birthDate?: string;
    preferredAgeMin?: number;
    preferredAgeMax?: number;
    preferredDistance?: number;
    verificationStatus?: string;
  }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用戶 ' + userId + ' 不存在');
    }

    const allowedFields = [
      'displayName', 'email', 'username', 'bio', 'avatarUrl',
      'userType', 'permissionRole', 'city', 'country', 'dmPrice',
      'birthDate', 'preferredAgeMin', 'preferredAgeMax',
      'preferredDistance', 'verificationStatus',
    ];

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const field of allowedFields) {
      if (updateData[field as keyof typeof updateData] !== undefined) {
        const oldValue = (user as Record<string, unknown>)[field];
        const newValue = updateData[field as keyof typeof updateData];
        if (oldValue !== newValue) {
          changes[field] = { from: oldValue, to: newValue };
          (user as Record<string, unknown>)[field] = newValue;
        }
      }
    }

    // 同步 role 欄位（向後兼容）
    if (updateData.permissionRole) {
      user.role = updateData.permissionRole;
    }

    if (Object.keys(changes).length === 0) {
      return { success: true, message: '沒有需要更新的欄位', changes: {} };
    }

    await this.userRepo.save(user);

    this.logger.warn(`用戶資料更新: ${userId}`, { changes });
    return {
      success: true,
      message: `已更新 ${Object.keys(changes).length} 個欄位`,
      changes,
      user: this.sanitizeUser(user),
    };
  }

  /** 取得用戶活動摘要（訂閱、交易、貼文） */
  async getUserActivity(userId: string) {
    const [posts, subscriptions, transactions] = await Promise.all([
      this.postRepo
        .createQueryBuilder('p')
        .where('p.creatorId = :userId', { userId })
        .orderBy('p.createdAt', 'DESC')
        .take(10)
        .getMany(),
      this.subscriptionRepo
        .createQueryBuilder('s')
        .where('s.subscriberId = :userId OR s.creatorId = :userId', { userId })
        .orderBy('s.createdAt', 'DESC')
        .take(10)
        .getMany(),
      this.transactionRepo
        .createQueryBuilder('t')
        .where('t.userId = :userId', { userId })
        .orderBy('t.createdAt', 'DESC')
        .take(10)
        .getMany(),
    ]);

    const postCount = await this.postRepo.count({ where: { creatorId: userId } });
    const subCount = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.subscriberId = :userId OR s.creatorId = :userId', { userId })
      .getCount();
    const txCount = await this.transactionRepo.count({ where: { userId } });

    return {
      posts: posts.map((p) => ({
        id: p.id,
        contentType: p.contentType,
        caption: p.caption,
        visibility: p.visibility,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      })),
      postCount,
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        subscriberId: s.subscriberId,
        creatorId: s.creatorId,
        status: s.status,
        createdAt: s.createdAt,
      })),
      subscriptionCount: subCount,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        status: t.status,
        createdAt: t.createdAt,
      })),
      transactionCount: txCount,
    };
  }

  /** 批量停用用戶帳號 */
  async batchDisableUsers(userIds: string[]) {
    // Batch query all users to avoid N+1 problem
    const users = await this.userRepo
      .createQueryBuilder('user')
      .whereInIds(userIds)
      .getMany();

    // Use Redis pipeline for batch write
    const pipeline = this.redisService.getClient().pipeline();
    users.forEach(user => {
      pipeline.set('user:disabled:' + user.id, 'true');
    });
    await pipeline.exec();

    const disabledCount = users.length;
    this.logger.warn(`批量停用用戶: ${disabledCount}/${userIds.length}`);
    return { success: true, disabledCount };
  }

  // ---- 私有方法 ----

  /** 從 Redis 掃描取得所有被停用的用戶 ID */
  private async getDisabledUserIds(): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await client.scan(cursor, 'MATCH', 'user:disabled:*', 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      return keys.map((k) => k.replace('user:disabled:', ''));
    } catch {
      return [];
    }
  }

  /** 移除密碼等敏感欄位 */
  private sanitizeUser(user: UserEntity) {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}
