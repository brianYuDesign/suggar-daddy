import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@suggar-daddy/redis';
import { UserEntity, PostEntity } from '@suggar-daddy/database';

/** 失敗寫入記錄介面 */
interface FailedWrite {
  id: string;
  type: 'user' | 'post';
  entityId: string;
  operation: 'sync_redis' | 'sync_db';
  payload: any;
  error: string;
  retryCount: number;
  createdAt: string;
  lastRetryAt: string | null;
}

/** Redis key 常數 */
const FAILED_WRITES_LIST = 'failed-writes:list';
const FAILED_WRITE_KEY = (id: string) => 'failed-writes:' + id;
const USER_KEY = (id: string) => 'user:' + id;
const POST_KEY = (id: string) => 'post:' + id;
const CONSISTENCY_STATS_KEY = 'consistency:stats';

/** 最大重試次數 */
const MAX_RETRY_COUNT = 10;

/** 背景重試間隔（毫秒） */
const RETRY_INTERVAL_MS = 30_000;

/**
 * 一致性服務
 *
 * 負責 Redis 與 PostgreSQL 之間的資料一致性管理：
 * - 記錄並重試失敗的寫入操作
 * - 定期比對 Redis 與 DB 資料是否一致
 * - 自動修復不一致的資料
 */
@Injectable()
export class ConsistencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConsistencyService.name);
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    private readonly redis: RedisService,
  ) {}

  /** 模組初始化時啟動背景重試工作 */
  onModuleInit(): void {
    this.logger.log('啟動一致性服務背景重試工作，間隔 30 秒');
    this.retryTimer = setInterval(() => {
      this.retryFailedWrites().catch((err) => {
        this.logger.error('背景重試失敗寫入時發生錯誤', err?.stack || err);
      });
    }, RETRY_INTERVAL_MS);
  }

  /** 模組銷毀時清除定時器 */
  onModuleDestroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
      this.logger.log('已停止一致性服務背景重試工作');
    }
  }

  /**
   * 記錄一筆失敗的寫入操作到 Redis 佇列
   *
   * @param type - 實體類型（user 或 post）
   * @param entityId - 實體 ID
   * @param operation - 操作類型（sync_redis 或 sync_db）
   * @param payload - 原始資料
   * @param error - 錯誤訊息
   */
  async addFailedWrite(
    type: 'user' | 'post',
    entityId: string,
    operation: 'sync_redis' | 'sync_db',
    payload: any,
    error: string,
  ): Promise<void> {
    const id = type + ':' + entityId + ':' + Date.now();
    const record: FailedWrite = {
      id,
      type,
      entityId,
      operation,
      payload,
      error,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      lastRetryAt: null,
    };

    // 儲存失敗記錄的詳細資訊
    await this.redis.set(FAILED_WRITE_KEY(id), JSON.stringify(record));
    // 將 ID 加入待處理佇列
    await this.redis.lPush(FAILED_WRITES_LIST, id);

    this.logger.warn(
      '已記錄失敗寫入: type=' + type + ', entityId=' + entityId + ', operation=' + operation,
    );
  }

  /**
   * 處理所有待重試的失敗寫入
   *
   * 從佇列中取出所有失敗記錄，逐一嘗試重試。
   * 超過最大重試次數的記錄會被移除並記錄警告。
   */
  async retryFailedWrites(): Promise<{ retried: number; succeeded: number; failed: number }> {
    const ids = await this.redis.lRange(FAILED_WRITES_LIST, 0, -1);

    if (ids.length === 0) {
      return { retried: 0, succeeded: 0, failed: 0 };
    }

    this.logger.log('開始重試 ' + ids.length + ' 筆失敗寫入');

    let succeeded = 0;
    let failed = 0;

    for (const id of ids) {
      const raw = await this.redis.get(FAILED_WRITE_KEY(id));
      if (!raw) {
        // 記錄已不存在，從佇列中移除
        await this.removeFromList(id);
        continue;
      }

      const record: FailedWrite = JSON.parse(raw);

      // 超過最大重試次數，放棄並移除
      if (record.retryCount >= MAX_RETRY_COUNT) {
        this.logger.error(
          '失敗寫入已達最大重試次數，放棄: id=' + id + ', entityId=' + record.entityId,
        );
        await this.removeFromList(id);
        await this.redis.del(FAILED_WRITE_KEY(id));
        failed++;
        continue;
      }

      try {
        await this.executeRetry(record);
        // 重試成功，清理記錄
        await this.removeFromList(id);
        await this.redis.del(FAILED_WRITE_KEY(id));
        succeeded++;
        this.logger.log('重試成功: id=' + id);
      } catch (err: any) {
        // 重試失敗，更新重試計數
        record.retryCount++;
        record.lastRetryAt = new Date().toISOString();
        record.error = err?.message || String(err);
        await this.redis.set(FAILED_WRITE_KEY(id), JSON.stringify(record));
        failed++;
        this.logger.warn(
          '重試失敗: id=' + id + ', retryCount=' + record.retryCount + ', error=' + record.error,
        );
      }
    }

    const result = { retried: ids.length, succeeded, failed };
    this.logger.log(
      '重試完成: retried=' + result.retried + ', succeeded=' + succeeded + ', failed=' + failed,
    );
    return result;
  }

  /**
   * 執行單筆重試操作
   *
   * 根據操作類型（sync_redis 或 sync_db）決定同步方向：
   * - sync_redis: 從 DB 讀取資料並寫入 Redis
   * - sync_db: 從 Redis 讀取資料並寫入 DB
   */
  private async executeRetry(record: FailedWrite): Promise<void> {
    if (record.operation === 'sync_redis') {
      // 從 DB 讀取最新資料，寫入 Redis
      if (record.type === 'user') {
        const user = await this.userRepo.findOne({ where: { id: record.entityId } });
        if (!user) {
          throw new Error('使用者不存在於 DB: id=' + record.entityId);
        }
        const redisData = {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          displayName: user.displayName,
          role: user.role,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt?.toISOString(),
          updatedAt: user.updatedAt?.toISOString(),
        };
        await this.redis.set(USER_KEY(user.id), JSON.stringify(redisData));
      } else if (record.type === 'post') {
        const post = await this.postRepo.findOne({ where: { id: record.entityId } });
        if (!post) {
          throw new Error('貼文不存在於 DB: id=' + record.entityId);
        }
        const redisData = {
          id: post.id,
          creatorId: post.creatorId,
          contentType: post.contentType,
          caption: post.caption,
          mediaUrls: post.mediaUrls,
          visibility: post.visibility,
          requiredTierId: post.requiredTierId,
          ppvPrice: post.ppvPrice,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          createdAt: post.createdAt?.toISOString(),
        };
        await this.redis.set(POST_KEY(post.id), JSON.stringify(redisData));
      }
    } else if (record.operation === 'sync_db') {
      // 從 Redis 讀取資料，寫入 DB
      if (record.type === 'user') {
        const raw = await this.redis.get(USER_KEY(record.entityId));
        if (!raw) {
          throw new Error('使用者不存在於 Redis: id=' + record.entityId);
        }
        const data = JSON.parse(raw);
        await this.userRepo.save({
          id: data.id,
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          role: data.role,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
        });
      } else if (record.type === 'post') {
        const raw = await this.redis.get(POST_KEY(record.entityId));
        if (!raw) {
          throw new Error('貼文不存在於 Redis: id=' + record.entityId);
        }
        const data = JSON.parse(raw);
        await this.postRepo.save({
          id: data.id,
          creatorId: data.creatorId,
          contentType: data.contentType,
          caption: data.caption,
          mediaUrls: data.mediaUrls,
          visibility: data.visibility,
          requiredTierId: data.requiredTierId,
          ppvPrice: data.ppvPrice,
          likeCount: data.likeCount,
          commentCount: data.commentCount,
        });
      }
    }
  }

  /**
   * 執行一致性檢查
   *
   * 從 DB 抽樣最近 100 筆使用者和貼文，
   * 比對 Redis 中對應資料是否存在且一致。
   *
   * @returns 不一致記錄清單
   */
  async runConsistencyCheck(): Promise<{
    checkedAt: string;
    userInconsistencies: Array<{ entityId: string; issue: string }>;
    postInconsistencies: Array<{ entityId: string; issue: string }>;
    totalChecked: number;
    totalInconsistencies: number;
  }> {
    this.logger.log('開始執行一致性檢查');

    const userInconsistencies: Array<{ entityId: string; issue: string }> = [];
    const postInconsistencies: Array<{ entityId: string; issue: string }> = [];

    // 檢查最近 100 筆使用者
    const users = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });

    for (const user of users) {
      const raw = await this.redis.get(USER_KEY(user.id));
      if (!raw) {
        userInconsistencies.push({
          entityId: user.id,
          issue: 'Redis 中不存在此使用者快取',
        });
        continue;
      }

      try {
        const cached = JSON.parse(raw);
        // 比對關鍵欄位
        if (cached.email !== user.email) {
          userInconsistencies.push({
            entityId: user.id,
            issue: 'email 不一致: DB=' + user.email + ', Redis=' + cached.email,
          });
        }
        if (cached.displayName !== user.displayName) {
          userInconsistencies.push({
            entityId: user.id,
            issue: 'displayName 不一致: DB=' + user.displayName + ', Redis=' + cached.displayName,
          });
        }
        if (cached.role !== user.role) {
          userInconsistencies.push({
            entityId: user.id,
            issue: 'role 不一致: DB=' + user.role + ', Redis=' + cached.role,
          });
        }
      } catch {
        userInconsistencies.push({
          entityId: user.id,
          issue: 'Redis 快取資料格式錯誤',
        });
      }
    }

    // 檢查最近 100 筆貼文
    const posts = await this.postRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });

    for (const post of posts) {
      const raw = await this.redis.get(POST_KEY(post.id));
      if (!raw) {
        postInconsistencies.push({
          entityId: post.id,
          issue: 'Redis 中不存在此貼文快取',
        });
        continue;
      }

      try {
        const cached = JSON.parse(raw);
        // 比對關鍵欄位
        if (cached.creatorId !== post.creatorId) {
          postInconsistencies.push({
            entityId: post.id,
            issue: 'creatorId 不一致: DB=' + post.creatorId + ', Redis=' + cached.creatorId,
          });
        }
        if (Number(cached.likeCount) !== Number(post.likeCount)) {
          postInconsistencies.push({
            entityId: post.id,
            issue: 'likeCount 不一致: DB=' + post.likeCount + ', Redis=' + cached.likeCount,
          });
        }
        if (Number(cached.commentCount) !== Number(post.commentCount)) {
          postInconsistencies.push({
            entityId: post.id,
            issue: 'commentCount 不一致: DB=' + post.commentCount + ', Redis=' + cached.commentCount,
          });
        }
        if (cached.visibility !== post.visibility) {
          postInconsistencies.push({
            entityId: post.id,
            issue: 'visibility 不一致: DB=' + post.visibility + ', Redis=' + cached.visibility,
          });
        }
      } catch {
        postInconsistencies.push({
          entityId: post.id,
          issue: 'Redis 快取資料格式錯誤',
        });
      }
    }

    const totalInconsistencies = userInconsistencies.length + postInconsistencies.length;
    const result = {
      checkedAt: new Date().toISOString(),
      userInconsistencies,
      postInconsistencies,
      totalChecked: users.length + posts.length,
      totalInconsistencies,
    };

    // 將檢查結果儲存到 Redis
    await this.redis.set(
      CONSISTENCY_STATS_KEY,
      JSON.stringify({
        lastCheckAt: result.checkedAt,
        totalChecked: result.totalChecked,
        totalInconsistencies: result.totalInconsistencies,
        userInconsistencies: result.userInconsistencies.length,
        postInconsistencies: result.postInconsistencies.length,
      }),
    );

    this.logger.log(
      '一致性檢查完成: 總檢查=' + result.totalChecked + ', 不一致=' + totalInconsistencies,
    );

    return result;
  }

  /**
   * 自動修復
   *
   * 執行一致性檢查，然後將所有不一致的資料從 DB 同步到 Redis。
   * 以 DB 為資料來源（single source of truth）。
   */
  async autoRepair(): Promise<{
    repaired: number;
    errors: Array<{ entityId: string; error: string }>;
  }> {
    this.logger.log('開始自動修復');

    const checkResult = await this.runConsistencyCheck();
    let repaired = 0;
    const errors: Array<{ entityId: string; error: string }> = [];

    // 修復使用者資料不一致
    for (const item of checkResult.userInconsistencies) {
      try {
        const user = await this.userRepo.findOne({ where: { id: item.entityId } });
        if (user) {
          const redisData = {
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            displayName: user.displayName,
            role: user.role,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt?.toISOString(),
            updatedAt: user.updatedAt?.toISOString(),
          };
          await this.redis.set(USER_KEY(user.id), JSON.stringify(redisData));
          repaired++;
          this.logger.log('已修復使用者快取: id=' + user.id);
        }
      } catch (err: any) {
        errors.push({
          entityId: item.entityId,
          error: err?.message || String(err),
        });
        this.logger.error('修復使用者快取失敗: id=' + item.entityId, err?.stack);
      }
    }

    // 修復貼文資料不一致
    for (const item of checkResult.postInconsistencies) {
      try {
        const post = await this.postRepo.findOne({ where: { id: item.entityId } });
        if (post) {
          const redisData = {
            id: post.id,
            creatorId: post.creatorId,
            contentType: post.contentType,
            caption: post.caption,
            mediaUrls: post.mediaUrls,
            visibility: post.visibility,
            requiredTierId: post.requiredTierId,
            ppvPrice: post.ppvPrice,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            createdAt: post.createdAt?.toISOString(),
          };
          await this.redis.set(POST_KEY(post.id), JSON.stringify(redisData));
          repaired++;
          this.logger.log('已修復貼文快取: id=' + post.id);
        }
      } catch (err: any) {
        errors.push({
          entityId: item.entityId,
          error: err?.message || String(err),
        });
        this.logger.error('修復貼文快取失敗: id=' + item.entityId, err?.stack);
      }
    }

    this.logger.log('自動修復完成: 已修復=' + repaired + ', 錯誤=' + errors.length);
    return { repaired, errors };
  }

  /**
   * 取得失敗寫入統計
   *
   * @returns 待處理數量與失敗寫入記錄列表
   */
  async getFailedWriteStats(): Promise<{
    pendingCount: number;
    records: FailedWrite[];
  }> {
    const ids = await this.redis.lRange(FAILED_WRITES_LIST, 0, -1);
    const records: FailedWrite[] = [];

    for (const id of ids) {
      const raw = await this.redis.get(FAILED_WRITE_KEY(id));
      if (raw) {
        try {
          records.push(JSON.parse(raw));
        } catch {
          // 跳過格式錯誤的記錄
          this.logger.warn('無法解析失敗寫入記錄: id=' + id);
        }
      }
    }

    return {
      pendingCount: records.length,
      records,
    };
  }

  /**
   * 取得監控指標
   *
   * 包含失敗寫入統計及上次一致性檢查結果。
   */
  async getMonitoringMetrics(): Promise<{
    failedWrites: { pendingCount: number; records: FailedWrite[] };
    lastConsistencyCheck: any;
  }> {
    const failedWrites = await this.getFailedWriteStats();

    // 從 Redis 取得上次一致性檢查結果
    const statsRaw = await this.redis.get(CONSISTENCY_STATS_KEY);
    let lastConsistencyCheck = null;
    if (statsRaw) {
      try {
        lastConsistencyCheck = JSON.parse(statsRaw);
      } catch {
        this.logger.warn('無法解析一致性檢查統計');
      }
    }

    return {
      failedWrites,
      lastConsistencyCheck,
    };
  }

  /**
   * 從失敗寫入佇列中移除指定 ID
   *
   * 使用 Redis LREM 命令移除佇列中的元素。
   */
  private async removeFromList(id: string): Promise<void> {
    await this.redis.getClient().lrem(FAILED_WRITES_LIST, 0, id);
  }
}