import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "@suggar-daddy/redis";
import { DataSource, EntityMetadata } from "typeorm";

/**
 * 數據不一致類型
 */
export enum InconsistencyType {
  /** Redis 有但 DB 沒有 */
  REDIS_ONLY = "REDIS_ONLY",
  /** DB 有但 Redis 沒有 */
  DB_ONLY = "DB_ONLY",
  /** 兩邊都有但數據不同 */
  DATA_MISMATCH = "DATA_MISMATCH",
}

/**
 * 不一致記錄
 */
export interface InconsistencyRecord {
  /** 實體類型 */
  entityType: string;
  /** 實體 ID */
  entityId: string;
  /** 不一致類型 */
  type: InconsistencyType;
  /** Redis 中的值 */
  redisValue: unknown;
  /** DB 中的值 */
  dbValue: unknown;
  /** 檢測時間 */
  detectedAt: Date;
  /** 是否已修復 */
  fixed: boolean;
}

/**
 * 一致性檢查配置
 */
export interface ConsistencyCheckConfig {
  /** 實體類型名稱（例如：User, Post） */
  entityName: string;
  /** Redis key 前綴（例如：user:, post:） */
  redisKeyPrefix: string;
  /** TypeORM 實體類 */
  entityClass: any;
  /** 唯一標識符欄位名稱（預設：id） */
  idField?: string;
  /** 需要比較的欄位列表（為空則比較所有欄位） */
  fieldsToCompare?: string[];
  /** 是否啟用自動修復（預設：false） */
  autoFix?: boolean;
}

/**
 * Redis ↔ DB 一致性校驗服務
 *
 * 功能：
 * 1. 定期掃描 Redis 和 DB 的數據差異
 * 2. 檢測不一致的數據
 * 3. 提供自動或手動修復機制
 * 4. 記錄和監控不一致情況
 */
@Injectable()
export class DataConsistencyService {
  private readonly logger = new Logger(DataConsistencyService.name);

  /** 不一致記錄（用於監控和報告） */
  private inconsistencies: InconsistencyRecord[] = [];

  constructor(
    private readonly redis: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 執行一致性檢查
   *
   * @param config 檢查配置
   * @returns 發現的不一致記錄列表
   */
  async checkConsistency(
    config: ConsistencyCheckConfig,
  ): Promise<InconsistencyRecord[]> {
    const {
      entityName,
      redisKeyPrefix,
      entityClass,
      idField = "id",
      fieldsToCompare = [],
      autoFix = false,
    } = config;

    this.logger.log(`開始檢查 ${entityName} 的數據一致性...`);

    const foundInconsistencies: InconsistencyRecord[] = [];

    try {
      // 1. 從 DB 獲取所有實體
      const repository = this.dataSource.getRepository(entityClass);
      const dbEntities = await repository.find();
      const dbEntityMap = new Map(dbEntities.map((e) => [e[idField], e]));

      this.logger.log(
        `從 DB 加載了 ${dbEntities.length} 條 ${entityName} 記錄`,
      );

      // 2. 從 Redis 獲取所有實體 ID
      const redisKeys = await this.scanRedisKeys(`${redisKeyPrefix}*`);
      this.logger.log(
        `從 Redis 發現 ${redisKeys.length} 條 ${entityName} 記錄`,
      );

      // 3. 比較 Redis 和 DB 的數據
      const checkedIds = new Set<string>();

      // 檢查 Redis 中的每個實體
      for (const redisKey of redisKeys) {
        const entityId = this.extractEntityId(redisKey, redisKeyPrefix);
        checkedIds.add(entityId);

        const redisData = await this.redis.get(redisKey);
        if (!redisData) continue;

        let redisEntity;
        try {
          redisEntity = JSON.parse(redisData);
        } catch {
          this.logger.warn(`無法解析 Redis 數據: ${redisKey}`);
          continue;
        }

        const dbEntity = dbEntityMap.get(entityId);

        if (!dbEntity) {
          // Redis 有但 DB 沒有
          const inconsistency = this.createInconsistency(
            entityName,
            entityId,
            InconsistencyType.REDIS_ONLY,
            redisEntity,
            null,
          );
          foundInconsistencies.push(inconsistency);

          if (autoFix) {
            await this.fixInconsistency(inconsistency, config);
          }
        } else {
          // 檢查數據是否匹配
          const isMismatch = this.compareData(
            dbEntity,
            redisEntity,
            fieldsToCompare.length > 0
              ? fieldsToCompare
              : Object.keys(dbEntity),
          );

          if (isMismatch) {
            const inconsistency = this.createInconsistency(
              entityName,
              entityId,
              InconsistencyType.DATA_MISMATCH,
              redisEntity,
              dbEntity,
            );
            foundInconsistencies.push(inconsistency);

            if (autoFix) {
              await this.fixInconsistency(inconsistency, config);
            }
          }
        }
      }

      // 4. 檢查 DB 中存在但 Redis 中不存在的實體
      for (const [dbId, dbEntity] of dbEntityMap.entries()) {
        if (!checkedIds.has(dbId)) {
          const inconsistency = this.createInconsistency(
            entityName,
            dbId,
            InconsistencyType.DB_ONLY,
            null,
            dbEntity,
          );
          foundInconsistencies.push(inconsistency);

          if (autoFix) {
            await this.fixInconsistency(inconsistency, config);
          }
        }
      }

      // 5. 記錄結果
      this.inconsistencies.push(...foundInconsistencies);

      if (foundInconsistencies.length > 0) {
        this.logger.warn(
          `發現 ${foundInconsistencies.length} 條 ${entityName} 數據不一致：` +
            `\n  REDIS_ONLY: ${foundInconsistencies.filter((i) => i.type === InconsistencyType.REDIS_ONLY).length}` +
            `\n  DB_ONLY: ${foundInconsistencies.filter((i) => i.type === InconsistencyType.DB_ONLY).length}` +
            `\n  DATA_MISMATCH: ${foundInconsistencies.filter((i) => i.type === InconsistencyType.DATA_MISMATCH).length}`,
        );
      } else {
        this.logger.log(`✅ ${entityName} 數據一致性檢查通過`);
      }

      return foundInconsistencies;
    } catch (error: unknown) {
      this.logger.error(
        `檢查 ${entityName} 一致性時發生錯誤:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * 修復數據不一致
   * 策略：以 DB 為準，更新 Redis
   *
   * @param inconsistency 不一致記錄
   * @param config 檢查配置
   */
  async fixInconsistency(
    inconsistency: InconsistencyRecord,
    config: ConsistencyCheckConfig,
  ): Promise<boolean> {
    const { entityName, redisKeyPrefix } = config;
    const redisKey = `${redisKeyPrefix}${inconsistency.entityId}`;

    try {
      switch (inconsistency.type) {
        case InconsistencyType.REDIS_ONLY:
          // Redis 有但 DB 沒有 -> 刪除 Redis 中的數據
          await this.redis.del(redisKey);
          this.logger.log(
            `已修復：刪除 Redis 中的孤立數據 ${entityName}:${inconsistency.entityId}`,
          );
          break;

        case InconsistencyType.DB_ONLY:
          // DB 有但 Redis 沒有 -> 從 DB 同步到 Redis
          if (inconsistency.dbValue) {
            await this.redis.set(
              redisKey,
              JSON.stringify(inconsistency.dbValue),
            );
            this.logger.log(
              `已修復：從 DB 同步到 Redis ${entityName}:${inconsistency.entityId}`,
            );
          }
          break;

        case InconsistencyType.DATA_MISMATCH:
          // 數據不匹配 -> 以 DB 為準更新 Redis
          if (inconsistency.dbValue) {
            await this.redis.set(
              redisKey,
              JSON.stringify(inconsistency.dbValue),
            );
            this.logger.log(
              `已修復：用 DB 數據覆蓋 Redis ${entityName}:${inconsistency.entityId}`,
            );
          }
          break;
      }

      inconsistency.fixed = true;
      return true;
    } catch (error: unknown) {
      this.logger.error(
        `修復 ${entityName}:${inconsistency.entityId} 失敗:`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  /**
   * 掃描 Redis keys（使用 SCAN 避免阻塞）
   */
  private async scanRedisKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";

    do {
      const client = this.redis.getClient();
      const result = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== "0");

    return keys;
  }

  /**
   * 從 Redis key 中提取實體 ID
   */
  private extractEntityId(redisKey: string, prefix: string): string {
    return redisKey.replace(prefix, "");
  }

  /**
   * 比較兩個對象的指定欄位是否相同
   */
  private compareData(obj1: Record<string, unknown>, obj2: Record<string, unknown>, fields: string[]): boolean {
    for (const field of fields) {
      // 跳過特殊欄位
      if (["createdAt", "updatedAt"].includes(field)) continue;

      const val1 = this.normalizeValue(obj1[field]);
      const val2 = this.normalizeValue(obj2[field]);

      if (val1 !== val2) {
        return true; // 發現不一致
      }
    }
    return false; // 數據一致
  }

  /**
   * 標準化值（處理 Date、null、undefined 等）
   */
  private normalizeValue(value: unknown): string {
    if (value === null || value === undefined) return "null";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  /**
   * 創建不一致記錄
   */
  private createInconsistency(
    entityType: string,
    entityId: string,
    type: InconsistencyType,
    redisValue: any,
    dbValue: any,
  ): InconsistencyRecord {
    return {
      entityType,
      entityId,
      type,
      redisValue,
      dbValue,
      detectedAt: new Date(),
      fixed: false,
    };
  }

  /**
   * 獲取所有不一致記錄
   */
  getInconsistencies(): InconsistencyRecord[] {
    return this.inconsistencies;
  }

  /**
   * 獲取統計信息
   */
  getStatistics(): {
    total: number;
    fixed: number;
    pending: number;
    byType: Record<InconsistencyType, number>;
  } {
    const total = this.inconsistencies.length;
    const fixed = this.inconsistencies.filter((i) => i.fixed).length;
    const pending = total - fixed;

    const byType: Record<InconsistencyType, number> = {
      [InconsistencyType.REDIS_ONLY]: this.inconsistencies.filter(
        (i) => i.type === InconsistencyType.REDIS_ONLY,
      ).length,
      [InconsistencyType.DB_ONLY]: this.inconsistencies.filter(
        (i) => i.type === InconsistencyType.DB_ONLY,
      ).length,
      [InconsistencyType.DATA_MISMATCH]: this.inconsistencies.filter(
        (i) => i.type === InconsistencyType.DATA_MISMATCH,
      ).length,
    };

    return { total, fixed, pending, byType };
  }

  /**
   * 清除不一致記錄
   */
  clearInconsistencies(): void {
    this.inconsistencies = [];
    this.logger.log("已清除不一致記錄");
  }
}
