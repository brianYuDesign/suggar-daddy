/**
 * @suggar-daddy/database
 * DB 連線、Repository 基類、Entity 定義
 *
 * ⚠️ 僅供 DB Writer（背景消費者）使用，用戶 API 不應引用此 lib。
 *    用戶 API 讀取 Redis、寫入 Kafka；DB 寫入由 Kafka 消費者異步完成。
 */

export * from './database.module';
export * from './entities';
