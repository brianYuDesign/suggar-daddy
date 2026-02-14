#!/usr/bin/env ts-node

/**
 * Redis 索引遷移腳本
 * 
 * 為現有的 Redis 數據建立必要的索引，以支持優化後的查詢
 * 
 * 建立的索引：
 * 1. media:index:all - 媒體全局索引（Sorted Set，按時間排序）
 * 2. user_matches:{userId} - 用戶配對索引（Set）
 * 3. subscriptions:subscriber:{userId} - 用戶訂閱索引（List）
 * 4. subscriptions:creator:{userId} - 創作者訂閱索引（List）
 */

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'],
  db: 0,
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// 掃描 Redis keys
async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');
  return keys;
}

// 遷移 1: 建立媒體全局索引
async function migrateMediaIndex() {
  log('\n📦 遷移 1: 建立媒體全局索引', colors.cyan);
  log('═══════════════════════════════════════════════════', colors.cyan);
  
  const mediaKeys = await scanKeys('media:media-*');
  log(`找到 ${mediaKeys.length} 個媒體記錄`, colors.yellow);
  
  if (mediaKeys.length === 0) {
    log('⚠️  沒有媒體需要遷移', colors.yellow);
    return;
  }
  
  // 批量獲取媒體記錄
  const values = await redis.mget(...mediaKeys);
  
  // 建立索引
  const indexData: Array<{ score: number; member: string }> = [];
  let processed = 0;
  
  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    if (raw) {
      try {
        const media = JSON.parse(raw);
        const timestamp = new Date(media.createdAt).getTime();
        indexData.push({ score: timestamp, member: media.id });
        processed++;
      } catch (err) {
        log(`  ⚠️  無法解析媒體記錄: ${mediaKeys[i]}`, colors.yellow);
      }
    }
  }
  
  // 批量寫入索引
  if (indexData.length > 0) {
    const pipeline = redis.pipeline();
    
    // 分批寫入（每次 100 個）
    for (let i = 0; i < indexData.length; i += 100) {
      const batch = indexData.slice(i, i + 100);
      const args: (number | string)[] = [];
      batch.forEach(item => {
        args.push(item.score, item.member);
      });
      pipeline.zadd('media:index:all', ...args);
    }
    
    await pipeline.exec();
    log(`✅ 成功建立 ${indexData.length} 個媒體索引`, colors.green);
  }
}

// 遷移 2: 建立用戶配對索引
async function migrateMatchingIndex() {
  log('\n🤝 遷移 2: 建立用戶配對索引', colors.cyan);
  log('═══════════════════════════════════════════════════', colors.cyan);
  
  const matchKeys = await scanKeys('match:*');
  log(`找到 ${matchKeys.length} 個配對記錄`, colors.yellow);
  
  if (matchKeys.length === 0) {
    log('⚠️  沒有配對需要遷移', colors.yellow);
    return;
  }
  
  // 批量獲取配對記錄
  const values = await redis.mget(...matchKeys);
  
  // 建立用戶索引
  const userMatchesMap = new Map<string, Set<string>>();
  let processed = 0;
  
  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    if (raw) {
      try {
        const match = JSON.parse(raw);
        
        // 只處理 active 狀態的配對
        if (match.status === 'active') {
          // 為 userA 建立索引
          if (!userMatchesMap.has(match.userAId)) {
            userMatchesMap.set(match.userAId, new Set());
          }
          userMatchesMap.get(match.userAId)!.add(match.id);
          
          // 為 userB 建立索引
          if (!userMatchesMap.has(match.userBId)) {
            userMatchesMap.set(match.userBId, new Set());
          }
          userMatchesMap.get(match.userBId)!.add(match.id);
          
          processed++;
        }
      } catch (err) {
        log(`  ⚠️  無法解析配對記錄: ${matchKeys[i]}`, colors.yellow);
      }
    }
  }
  
  // 寫入索引
  if (userMatchesMap.size > 0) {
    const pipeline = redis.pipeline();
    
    for (const [userId, matchIds] of userMatchesMap.entries()) {
      const indexKey = `user_matches:${userId}`;
      // 先刪除舊索引
      pipeline.del(indexKey);
      // 添加新索引
      if (matchIds.size > 0) {
        pipeline.sadd(indexKey, ...Array.from(matchIds));
      }
    }
    
    await pipeline.exec();
    log(`✅ 成功為 ${userMatchesMap.size} 個用戶建立配對索引`, colors.green);
    log(`   總共 ${processed} 個配對記錄`, colors.green);
  }
}

// 遷移 3: 建立訂閱索引
async function migrateSubscriptionIndex() {
  log('\n📋 遷移 3: 建立訂閱索引', colors.cyan);
  log('═══════════════════════════════════════════════════', colors.cyan);
  
  const subKeys = await scanKeys('subscription:sub-*');
  log(`找到 ${subKeys.length} 個訂閱記錄`, colors.yellow);
  
  if (subKeys.length === 0) {
    log('⚠️  沒有訂閱需要遷移', colors.yellow);
    return;
  }
  
  // 批量獲取訂閱記錄
  const values = await redis.mget(...subKeys);
  
  // 建立索引
  const subscriberMap = new Map<string, Array<{ id: string; createdAt: string }>>();
  const creatorMap = new Map<string, Array<{ id: string; createdAt: string }>>();
  let processed = 0;
  
  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    if (raw) {
      try {
        const sub = JSON.parse(raw);
        
        // 只處理 active 狀態的訂閱
        if (sub.status === 'active') {
          // 訂閱者索引
          if (!subscriberMap.has(sub.subscriberId)) {
            subscriberMap.set(sub.subscriberId, []);
          }
          subscriberMap.get(sub.subscriberId)!.push({
            id: sub.id,
            createdAt: sub.createdAt,
          });
          
          // 創作者索引
          if (!creatorMap.has(sub.creatorId)) {
            creatorMap.set(sub.creatorId, []);
          }
          creatorMap.get(sub.creatorId)!.push({
            id: sub.id,
            createdAt: sub.createdAt,
          });
          
          processed++;
        }
      } catch (err) {
        log(`  ⚠️  無法解析訂閱記錄: ${subKeys[i]}`, colors.yellow);
      }
    }
  }
  
  // 寫入索引
  const pipeline = redis.pipeline();
  
  // 訂閱者索引
  for (const [subscriberId, subs] of subscriberMap.entries()) {
    const indexKey = `subscriptions:subscriber:${subscriberId}`;
    // 刪除舊索引
    pipeline.del(indexKey);
    // 按創建時間排序（新的在前）
    subs.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
    // 添加新索引
    if (subs.length > 0) {
      pipeline.lpush(indexKey, ...subs.map(s => s.id));
    }
  }
  
  // 創作者索引
  for (const [creatorId, subs] of creatorMap.entries()) {
    const indexKey = `subscriptions:creator:${creatorId}`;
    // 刪除舊索引
    pipeline.del(indexKey);
    // 按創建時間排序
    subs.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
    // 添加新索引
    if (subs.length > 0) {
      pipeline.lpush(indexKey, ...subs.map(s => s.id));
    }
  }
  
  await pipeline.exec();
  log(`✅ 成功建立訂閱索引`, colors.green);
  log(`   訂閱者索引: ${subscriberMap.size} 個`, colors.green);
  log(`   創作者索引: ${creatorMap.size} 個`, colors.green);
  log(`   總共 ${processed} 個訂閱記錄`, colors.green);
}

// 驗證索引
async function verifyIndexes() {
  log('\n🔍 驗證索引', colors.cyan);
  log('═══════════════════════════════════════════════════', colors.cyan);
  
  // 驗證媒體索引
  const mediaIndexSize = await redis.zcard('media:index:all');
  log(`媒體索引: ${mediaIndexSize} 個記錄`, mediaIndexSize > 0 ? colors.green : colors.yellow);
  
  // 驗證配對索引
  const matchIndexKeys = await scanKeys('user_matches:*');
  log(`配對索引: ${matchIndexKeys.length} 個用戶`, matchIndexKeys.length > 0 ? colors.green : colors.yellow);
  
  // 驗證訂閱索引
  const subscriberIndexKeys = await scanKeys('subscriptions:subscriber:*');
  const creatorIndexKeys = await scanKeys('subscriptions:creator:*');
  log(`訂閱索引: ${subscriberIndexKeys.length} 個訂閱者, ${creatorIndexKeys.length} 個創作者`, 
    subscriberIndexKeys.length > 0 ? colors.green : colors.yellow);
  
  log('\n✅ 索引驗證完成', colors.green);
}

// 主函數
async function main() {
  try {
    log('╔════════════════════════════════════════════════════════╗', colors.blue);
    log('║  Redis 索引遷移腳本                                    ║', colors.blue);
    log('╚════════════════════════════════════════════════════════╝', colors.blue);
    
    const startTime = Date.now();
    
    // 執行遷移
    await migrateMediaIndex();
    await migrateMatchingIndex();
    await migrateSubscriptionIndex();
    
    // 驗證索引
    await verifyIndexes();
    
    const duration = Date.now() - startTime;
    log(`\n⏱️  總耗時: ${duration}ms`, colors.blue);
    log('\n🎉 索引遷移完成！', colors.green);
    
  } catch (error) {
    log(`\n❌ 錯誤: ${error}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

// 執行遷移
if (require.main === module) {
  main();
}

export { main as migrateIndexes };
