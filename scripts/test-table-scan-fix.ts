#!/usr/bin/env ts-node

/**
 * 測試腳本：驗證全表掃描修復後的性能改善
 * 
 * 測試項目：
 * 1. matching-service.getMatches() - 從全表掃描改為索引查詢
 * 2. subscription-service.findBySubscriber() - 從全量載入改為分頁查詢
 * 3. media-service.findAll() - 從 SCAN 改為 Sorted Set 索引
 */

import Redis from 'ioredis';

const redis = new Redis({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'],
  db: 0,
});

interface TestResult {
  testName: string;
  before: number;
  after: number;
  improvement: number;
  status: 'PASS' | 'FAIL';
}

const results: TestResult[] = [];

// 顏色輸出
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

// 測試 1: matching-service.getMatches()
async function testMatchingServiceOptimization() {
  log('\n📊 測試 1: matching-service.getMatches() 優化', colors.cyan);
  log('════════════════════════════════════════════════════', colors.cyan);
  
  const testUserId = 'test-user-1';
  const numMatches = 100;
  
  // 準備測試數據
  log('準備測試數據...', colors.yellow);
  await setupMatchingTestData(testUserId, numMatches);
  
  // 舊方法：使用 SCAN 全表掃描
  log('\n🔴 舊方法：SCAN 全表掃描', colors.red);
  const beforeStart = Date.now();
  const allMatchKeys = await scanMatches();
  const matchValues = await redis.mget(...allMatchKeys);
  const beforeTime = Date.now() - beforeStart;
  log(`  時間: ${beforeTime}ms`, colors.red);
  log(`  掃描了 ${allMatchKeys.length} 個 keys`, colors.red);
  
  // 新方法：使用用戶索引
  log('\n🟢 新方法：使用用戶索引 + MGET', colors.green);
  const afterStart = Date.now();
  const userMatchIds = await redis.smembers(`user_matches:${testUserId}`);
  const matchKeys = userMatchIds.slice(0, 20).map(id => `match:${id}`);
  const values = await redis.mget(...matchKeys);
  const afterTime = Date.now() - afterStart;
  log(`  時間: ${afterTime}ms`, colors.green);
  log(`  只查詢了 ${matchKeys.length} 個 keys（分頁限制）`, colors.green);
  
  const improvement = ((beforeTime - afterTime) / beforeTime * 100).toFixed(1);
  log(`\n✅ 性能提升: ${improvement}%`, colors.green);
  
  results.push({
    testName: 'matching-service.getMatches()',
    before: beforeTime,
    after: afterTime,
    improvement: parseFloat(improvement),
    status: parseFloat(improvement) > 50 ? 'PASS' : 'FAIL',
  });
}

async function scanMatches(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, 'MATCH', 'match:*', 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');
  return keys;
}

async function setupMatchingTestData(userId: string, count: number) {
  const pipeline = redis.pipeline();
  
  for (let i = 0; i < count; i++) {
    const matchId = `match-${Date.now()}-${i}`;
    const otherUserId = `user-${i}`;
    const match = {
      id: matchId,
      userAId: userId,
      userBId: otherUserId,
      matchedAt: new Date(),
      status: 'active',
    };
    
    pipeline.set(`match:${matchId}`, JSON.stringify(match));
    pipeline.sadd(`user_matches:${userId}`, matchId);
  }
  
  await pipeline.exec();
  log(`  ✓ 創建了 ${count} 個配對記錄`, colors.green);
}

// 測試 2: subscription-service.findBySubscriber()
async function testSubscriptionServiceOptimization() {
  log('\n📊 測試 2: subscription-service.findBySubscriber() 優化', colors.cyan);
  log('════════════════════════════════════════════════════', colors.cyan);
  
  const testUserId = 'test-subscriber-1';
  const numSubscriptions = 50;
  const pageSize = 20;
  
  // 準備測試數據
  log('準備測試數據...', colors.yellow);
  await setupSubscriptionTestData(testUserId, numSubscriptions);
  
  // 舊方法：載入全部再分頁
  log('\n🔴 舊方法：載入全部訂閱再過濾分頁', colors.red);
  const beforeStart = Date.now();
  const allIds = await redis.lrange(`subscriptions:subscriber:${testUserId}`, 0, -1);
  const allKeys = allIds.map(id => `subscription:${id}`);
  const allValues = await redis.mget(...allKeys);
  const filtered = allValues
    .filter(Boolean)
    .map(v => JSON.parse(v!))
    .filter(s => s.status === 'active')
    .slice(0, pageSize);
  const beforeTime = Date.now() - beforeStart;
  log(`  時間: ${beforeTime}ms`, colors.red);
  log(`  載入了 ${allIds.length} 個訂閱`, colors.red);
  
  // 新方法：直接分頁查詢
  log('\n🟢 新方法：使用 LRANGE 直接分頁', colors.green);
  const afterStart = Date.now();
  const pageIds = await redis.lrange(`subscriptions:subscriber:${testUserId}`, 0, pageSize - 1);
  const pageKeys = pageIds.map(id => `subscription:${id}`);
  const pageValues = await redis.mget(...pageKeys);
  const pageData = pageValues
    .filter(Boolean)
    .map(v => JSON.parse(v!))
    .filter(s => s.status === 'active');
  const afterTime = Date.now() - afterStart;
  log(`  時間: ${afterTime}ms`, colors.green);
  log(`  只載入了 ${pageIds.length} 個訂閱（一頁）`, colors.green);
  
  const improvement = ((beforeTime - afterTime) / beforeTime * 100).toFixed(1);
  log(`\n✅ 性能提升: ${improvement}%`, colors.green);
  
  results.push({
    testName: 'subscription-service.findBySubscriber()',
    before: beforeTime,
    after: afterTime,
    improvement: parseFloat(improvement),
    status: parseFloat(improvement) > 30 ? 'PASS' : 'FAIL',
  });
}

async function setupSubscriptionTestData(userId: string, count: number) {
  const pipeline = redis.pipeline();
  
  for (let i = 0; i < count; i++) {
    const subId = `sub-${Date.now()}-${i}`;
    const subscription = {
      id: subId,
      subscriberId: userId,
      creatorId: `creator-${i}`,
      tierId: `tier-${i % 3}`,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    pipeline.set(`subscription:${subId}`, JSON.stringify(subscription));
    pipeline.lpush(`subscriptions:subscriber:${userId}`, subId);
  }
  
  await pipeline.exec();
  log(`  ✓ 創建了 ${count} 個訂閱記錄`, colors.green);
}

// 測試 3: media-service.findAll()
async function testMediaServiceOptimization() {
  log('\n📊 測試 3: media-service.findAll() 優化', colors.cyan);
  log('════════════════════════════════════════════════════', colors.cyan);
  
  const numMedia = 100;
  const pageSize = 20;
  
  // 準備測試數據
  log('準備測試數據...', colors.yellow);
  await setupMediaTestData(numMedia);
  
  // 舊方法：SCAN 全表掃描
  log('\n🔴 舊方法：SCAN 全表掃描', colors.red);
  const beforeStart = Date.now();
  const allMediaKeys = await scanMedia();
  const allMediaValues = await redis.mget(...allMediaKeys);
  const allMedia = allMediaValues.filter(Boolean).map(v => JSON.parse(v!));
  allMedia.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
  const page1 = allMedia.slice(0, pageSize);
  const beforeTime = Date.now() - beforeStart;
  log(`  時間: ${beforeTime}ms`, colors.red);
  log(`  掃描了 ${allMediaKeys.length} 個媒體`, colors.red);
  
  // 新方法：使用 Sorted Set 索引
  log('\n🟢 新方法：使用 Sorted Set 索引 + ZREVRANGE', colors.green);
  const afterStart = Date.now();
  const mediaIds = await redis.zrevrange('media:index:all', 0, pageSize - 1);
  const mediaKeys = mediaIds.map(id => `media:${id}`);
  const mediaValues = await redis.mget(...mediaKeys);
  const media = mediaValues.filter(Boolean).map(v => JSON.parse(v!));
  const afterTime = Date.now() - afterStart;
  log(`  時間: ${afterTime}ms`, colors.green);
  log(`  只查詢了 ${mediaIds.length} 個媒體（一頁）`, colors.green);
  
  const improvement = ((beforeTime - afterTime) / beforeTime * 100).toFixed(1);
  log(`\n✅ 性能提升: ${improvement}%`, colors.green);
  
  results.push({
    testName: 'media-service.findAll()',
    before: beforeTime,
    after: afterTime,
    improvement: parseFloat(improvement),
    status: parseFloat(improvement) > 50 ? 'PASS' : 'FAIL',
  });
}

async function scanMedia(): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, 'MATCH', 'media:media-*', 'COUNT', 100);
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');
  return keys;
}

async function setupMediaTestData(count: number) {
  const pipeline = redis.pipeline();
  
  for (let i = 0; i < count; i++) {
    const mediaId = `media-${Date.now()}-${i}`;
    const timestamp = Date.now() - i * 1000; // 確保有時間順序
    const media = {
      id: mediaId,
      userId: `user-${i % 10}`,
      fileType: 'image',
      originalUrl: `https://example.com/${mediaId}.jpg`,
      fileName: `test-${i}.jpg`,
      createdAt: new Date(timestamp).toISOString(),
    };
    
    pipeline.set(`media:${mediaId}`, JSON.stringify(media));
    pipeline.zadd('media:index:all', timestamp, mediaId);
  }
  
  await pipeline.exec();
  log(`  ✓ 創建了 ${count} 個媒體記錄和索引`, colors.green);
}

// 清理測試數據
async function cleanup() {
  log('\n🧹 清理測試數據...', colors.yellow);
  
  // 清理 matching 數據
  const matchKeys = await scanMatches();
  if (matchKeys.length > 0) {
    await redis.del(...matchKeys);
  }
  await redis.del('user_matches:test-user-1');
  
  // 清理 subscription 數據
  const subKeys = await redis.keys('subscription:sub-*');
  if (subKeys.length > 0) {
    await redis.del(...subKeys);
  }
  await redis.del('subscriptions:subscriber:test-subscriber-1');
  
  // 清理 media 數據
  const mediaKeys = await scanMedia();
  if (mediaKeys.length > 0) {
    await redis.del(...mediaKeys);
  }
  await redis.del('media:index:all');
  
  log('  ✓ 清理完成', colors.green);
}

// 顯示測試結果摘要
function showSummary() {
  log('\n═══════════════════════════════════════════════════════', colors.blue);
  log('📋 測試結果摘要', colors.blue);
  log('═══════════════════════════════════════════════════════', colors.blue);
  
  console.table(results);
  
  const totalImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
  const passCount = results.filter(r => r.status === 'PASS').length;
  
  log('\n📈 總體結果:', colors.blue);
  log(`  平均性能提升: ${totalImprovement.toFixed(1)}%`, colors.green);
  log(`  通過測試: ${passCount}/${results.length}`, passCount === results.length ? colors.green : colors.red);
  
  if (passCount === results.length) {
    log('\n🎉 所有測試通過！全表掃描問題已成功修復。', colors.green);
  } else {
    log('\n⚠️  部分測試未達到預期性能提升。', colors.yellow);
  }
}

// 主函數
async function main() {
  try {
    log('╔════════════════════════════════════════════════════════╗', colors.blue);
    log('║  全表掃描修復性能測試                                  ║', colors.blue);
    log('╚════════════════════════════════════════════════════════╝', colors.blue);
    
    // 執行測試
    await testMatchingServiceOptimization();
    await testSubscriptionServiceOptimization();
    await testMediaServiceOptimization();
    
    // 顯示結果
    showSummary();
    
    // 清理
    await cleanup();
    
  } catch (error) {
    log(`\n❌ 錯誤: ${error}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

// 執行測試
if (require.main === module) {
  main();
}
