#!/usr/bin/env node
/**
 * Admin Panel E2E 自動化測試
 * 測試範圍：登入、用戶管理、內容審核、系統監控、數據分析
 * 排除：付款相關功能
 */

import http from 'node:http';

const GATEWAY = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin1234';

let TOKEN = '';
let passed = 0;
let failed = 0;
const results = [];

// ─── HTTP Helper ───────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, GATEWAY);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const GET = (path) => request('GET', path, null, TOKEN);
const POST = (path, body) => request('POST', path, body, TOKEN);

// ─── Assert Helpers ────────────────────────────────────────────────
function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    results.push({ name, status: 'FAIL', detail });
    console.log(`  \x1b[31m✗\x1b[0m ${name} ${detail ? '— ' + detail : ''}`);
  }
}

// ─── Seed Data ─────────────────────────────────────────────────────
async function seedDatabase() {
  console.log('\n\x1b[1m📦 Seeding test data...\x1b[0m');

  const { Client } = await import('pg');
  const Redis = (await import('ioredis')).default;

  const pg = new Client({
    host: 'localhost', port: 5432,
    user: 'admin', password: 'devpassword',
    database: 'suggar_daddy',
  });
  await pg.connect();

  const redis = new Redis({ host: 'localhost', port: 6379 });

  // Create tables via TypeORM sync (already done by admin-service on start)
  // Just insert test data

  // --- Users ---
  const users = [
    { id: '11111111-1111-1111-1111-111111111111', email: 'creator1@test.com', displayName: 'Alice Creator', role: 'creator' },
    { id: '22222222-2222-2222-2222-222222222222', email: 'creator2@test.com', displayName: 'Bob Creator', role: 'creator' },
    { id: '33333333-3333-3333-3333-333333333333', email: 'sub1@test.com', displayName: 'Charlie Sub', role: 'subscriber' },
    { id: '44444444-4444-4444-4444-444444444444', email: 'sub2@test.com', displayName: 'Diana Sub', role: 'subscriber' },
    { id: '55555555-5555-5555-5555-555555555555', email: 'sub3@test.com', displayName: 'Eve Sub', role: 'subscriber' },
  ];

  for (const u of users) {
    await pg.query(`
      INSERT INTO users (id, email, "passwordHash", "displayName", role, "createdAt", "updatedAt")
      VALUES ($1, $2, 'hash', $3, $4, NOW() - interval '${Math.floor(Math.random() * 20)} days', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [u.id, u.email, u.displayName, u.role]);
  }
  console.log('  → 5 users inserted');

  // --- Posts ---
  const posts = [
    { id: 'aaaa0001-0001-0001-0001-000000000001', creatorId: users[0].id, contentType: 'image', caption: 'Beautiful sunset', visibility: 'public', likeCount: 42, commentCount: 8 },
    { id: 'aaaa0002-0002-0002-0002-000000000002', creatorId: users[0].id, contentType: 'video', caption: 'Dance tutorial', visibility: 'public', likeCount: 100, commentCount: 25 },
    { id: 'aaaa0003-0003-0003-0003-000000000003', creatorId: users[1].id, contentType: 'image', caption: 'Cooking recipe', visibility: 'public', likeCount: 30, commentCount: 5 },
    { id: 'aaaa0004-0004-0004-0004-000000000004', creatorId: users[1].id, contentType: 'image', caption: 'Inappropriate content', visibility: 'public', likeCount: 2, commentCount: 0 },
    { id: 'aaaa0005-0005-0005-0005-000000000005', creatorId: users[0].id, contentType: 'video', caption: 'Premium only', visibility: 'subscribers_only', likeCount: 15, commentCount: 3 },
  ];

  for (const p of posts) {
    await pg.query(`
      INSERT INTO posts (id, "creatorId", "contentType", caption, "mediaUrls", visibility, "likeCount", "commentCount", "createdAt")
      VALUES ($1, $2, $3, $4, '[]', $5, $6, $7, NOW() - interval '${Math.floor(Math.random() * 10)} days')
      ON CONFLICT (id) DO NOTHING
    `, [p.id, p.creatorId, p.contentType, p.caption, p.visibility, p.likeCount, p.commentCount]);
  }
  console.log('  → 5 posts inserted');

  // --- Tips (for analytics) ---
  const tips = [
    { fromUserId: users[2].id, toUserId: users[0].id, amount: 50.00 },
    { fromUserId: users[3].id, toUserId: users[0].id, amount: 25.00 },
    { fromUserId: users[4].id, toUserId: users[0].id, amount: 100.00 },
    { fromUserId: users[2].id, toUserId: users[1].id, amount: 30.00 },
    { fromUserId: users[3].id, toUserId: users[1].id, amount: 15.00 },
  ];

  for (const t of tips) {
    await pg.query(`
      INSERT INTO tips (id, "fromUserId", "toUserId", amount, "createdAt")
      VALUES (gen_random_uuid(), $1, $2, $3, NOW() - interval '${Math.floor(Math.random() * 7)} days')
    `, [t.fromUserId, t.toUserId, t.amount]);
  }
  console.log('  → 5 tips inserted');

  // --- Subscriptions (for churn rate) ---
  const subs = [
    { subscriberId: users[2].id, creatorId: users[0].id, status: 'active', cancelledAt: null },
    { subscriberId: users[3].id, creatorId: users[0].id, status: 'active', cancelledAt: null },
    { subscriberId: users[4].id, creatorId: users[1].id, status: 'cancelled', cancelledAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  ];

  // Create a subscription tier first
  const tierId = 'bbbb0001-0001-0001-0001-000000000001';
  await pg.query(`
    INSERT INTO subscription_tiers (id, "creatorId", name, "priceMonthly", benefits, "isActive", "createdAt")
    VALUES ($1, $2, 'Basic', 9.99, '["Access to all posts"]', true, NOW())
    ON CONFLICT (id) DO NOTHING
  `, [tierId, users[0].id]);

  for (const s of subs) {
    await pg.query(`
      INSERT INTO subscriptions (id, "subscriberId", "creatorId", "tierId", status, "createdAt", "cancelledAt")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() - interval '${Math.floor(Math.random() * 30 + 10)} days', $5)
    `, [s.subscriberId, s.creatorId, tierId, s.status, s.cancelledAt]);
  }
  console.log('  → 3 subscriptions inserted');

  // --- Redis: Reports ---
  const reports = [
    { id: 'rpt-001', postId: posts[3].id, reporterId: users[2].id, reason: 'Inappropriate content', status: 'pending' },
    { id: 'rpt-002', postId: posts[3].id, reporterId: users[3].id, reason: 'Spam', status: 'pending' },
    { id: 'rpt-003', postId: posts[0].id, reporterId: users[4].id, reason: 'Copyright violation', status: 'resolved' },
  ];

  for (const r of reports) {
    await redis.set(`report:${r.id}`, JSON.stringify({ ...r, createdAt: new Date().toISOString() }));
  }
  console.log('  → 3 reports in Redis');

  // --- Redis: DAU data ---
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  await redis.sadd(`analytics:dau:${today}`, users[0].id, users[2].id, users[3].id);
  await redis.sadd(`analytics:dau:${yesterday}`, users[0].id, users[1].id, users[4].id);
  console.log('  → DAU data seeded');

  await pg.end();
  await redis.quit();
  console.log('  \x1b[32m✓ Seed complete\x1b[0m');
}

// ═══════════════════════════════════════════════════════════════════
// Test Suites
// ═══════════════════════════════════════════════════════════════════

async function testLogin() {
  console.log('\n\x1b[1m🔐 1. 登入測試\x1b[0m');

  // 1a. 正確登入
  const res = await request('POST', '/api/v1/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  assert('正確帳密登入成功 (201)', res.status === 201);
  assert('回傳 accessToken', !!res.data?.accessToken);
  assert('回傳 refreshToken', !!res.data?.refreshToken);
  assert('tokenType 為 Bearer', res.data?.tokenType === 'Bearer');
  TOKEN = res.data?.accessToken;

  // 1b. 錯誤密碼
  const bad = await request('POST', '/api/v1/auth/login', { email: ADMIN_EMAIL, password: 'wrongpass' });
  assert('錯誤密碼回傳 401', bad.status === 401);

  // 1c. 不存在的帳號
  const noUser = await request('POST', '/api/v1/auth/login', { email: 'nobody@test.com', password: 'xxx' });
  assert('不存在帳號回傳 401', noUser.status === 401);

  // 1d. 無 token 存取 admin API 應 401
  const noAuth = await request('GET', '/api/v1/admin/system/health', null);
  assert('無 token 存取 admin API 回傳 401', noAuth.status === 401);

  // 1e. Rate limit headers present
  assert('回應包含 X-RateLimit-Limit', !!res.headers['x-ratelimit-limit']);
  assert('回應包含 X-RateLimit-Remaining', !!res.headers['x-ratelimit-remaining']);
}

async function testUserManagement() {
  console.log('\n\x1b[1m👥 2. 用戶管理測試\x1b[0m');

  // 2a. 列表
  const list = await GET('/api/v1/admin/users?page=1&limit=10');
  assert('列表回傳 200', list.status === 200);
  assert('回傳 data 陣列', Array.isArray(list.data?.data));
  assert('total >= 5', list.data?.total >= 5);
  assert('用戶資料不含 passwordHash', !list.data?.data?.[0]?.passwordHash);

  // 2b. 角色篩選
  const creators = await GET('/api/v1/admin/users?page=1&limit=10&role=creator');
  assert('creator 角色篩選正常', creators.data?.data?.every(u => u.role === 'creator'));
  assert('creator 數量 = 2', creators.data?.total === 2);

  const subscribers = await GET('/api/v1/admin/users?page=1&limit=10&role=subscriber');
  assert('subscriber 角色篩選正常', subscribers.data?.data?.every(u => u.role === 'subscriber'));
  assert('subscriber 數量 = 3', subscribers.data?.total === 3);

  // 2c. 用戶詳情
  const userId = '11111111-1111-1111-1111-111111111111';
  const detail = await GET(`/api/v1/admin/users/${userId}`);
  assert('用戶詳情回傳 200', detail.status === 200);
  assert('詳情包含 email', detail.data?.email === 'creator1@test.com');
  assert('詳情包含 displayName', detail.data?.displayName === 'Alice Creator');
  assert('詳情包含 isDisabled', detail.data?.isDisabled === false);

  // 2d. 不存在用戶
  const notFound = await GET('/api/v1/admin/users/00000000-0000-0000-0000-000000000000');
  assert('不存在用戶回傳 404', notFound.status === 404);

  // 2e. 停用用戶
  const disable = await POST(`/api/v1/admin/users/${userId}/disable`);
  assert('停用用戶回傳 success', disable.data?.success === true);

  const afterDisable = await GET(`/api/v1/admin/users/${userId}`);
  assert('停用後 isDisabled = true', afterDisable.data?.isDisabled === true);

  // 2f. 篩選停用用戶
  const disabledList = await GET('/api/v1/admin/users?page=1&limit=10&status=disabled');
  assert('停用用戶篩選能找到結果', disabledList.data?.total >= 1);

  // 2g. 啟用用戶
  const enable = await POST(`/api/v1/admin/users/${userId}/enable`);
  assert('啟用用戶回傳 success', enable.data?.success === true);

  const afterEnable = await GET(`/api/v1/admin/users/${userId}`);
  assert('啟用後 isDisabled = false', afterEnable.data?.isDisabled === false);

  // 2h. 統計
  const stats = await GET('/api/v1/admin/users/stats');
  assert('用戶統計回傳 200', stats.status === 200);
  assert('totalUsers >= 5', stats.data?.totalUsers >= 5);
  assert('byRole 包含 creator', stats.data?.byRole?.creator >= 2);
  assert('byRole 包含 subscriber', stats.data?.byRole?.subscriber >= 3);
  assert('包含 newUsersThisWeek', typeof stats.data?.newUsersThisWeek === 'number');
  assert('包含 newUsersThisMonth', typeof stats.data?.newUsersThisMonth === 'number');
}

async function testContentModeration() {
  console.log('\n\x1b[1m📋 3. 內容審核測試\x1b[0m');

  // 3a. 檢舉列表
  const list = await GET('/api/v1/admin/content/reports?page=1&limit=10');
  assert('檢舉列表回傳 200', list.status === 200);
  assert('total = 3', list.data?.total === 3);
  assert('data 為陣列', Array.isArray(list.data?.data));

  // 3b. 按狀態篩選
  const pending = await GET('/api/v1/admin/content/reports?page=1&limit=10&status=pending');
  assert('pending 篩選 total = 2', pending.data?.total === 2);

  const resolved = await GET('/api/v1/admin/content/reports?page=1&limit=10&status=resolved');
  assert('resolved 篩選 total = 1', resolved.data?.total === 1);

  // 3c. 檢舉詳情
  const detail = await GET('/api/v1/admin/content/reports/rpt-001');
  assert('檢舉詳情回傳 200', detail.status === 200);
  assert('包含 reason', detail.data?.reason === 'Inappropriate content');
  assert('包含 post 物件', detail.data?.post !== undefined);
  assert('post 包含 caption', !!detail.data?.post?.caption);

  // 3d. 不存在的檢舉
  const notFound = await GET('/api/v1/admin/content/reports/nonexistent');
  assert('不存在檢舉回傳 404', notFound.status === 404);

  // 3e. 下架費文
  const postId = 'aaaa0004-0004-0004-0004-000000000004';
  const takeDown = await POST(`/api/v1/admin/content/posts/${postId}/take-down`, { reason: 'Violates community guidelines' });
  assert('下架回傳 success', takeDown.data?.success === true);

  // 3f. 下架後檢舉狀態應變為 resolved
  const afterTakeDown = await GET('/api/v1/admin/content/reports?page=1&limit=10&status=pending');
  assert('下架後 pending 減少為 0', afterTakeDown.data?.total === 0);

  const resolvedAfter = await GET('/api/v1/admin/content/reports?page=1&limit=10&status=resolved');
  assert('resolved 增加為 3', resolvedAfter.data?.total === 3);

  // 3g. 恢復費文
  const reinstate = await POST(`/api/v1/admin/content/posts/${postId}/reinstate`);
  assert('恢復回傳 success', reinstate.data?.success === true);

  // 3h. 不存在費文下架
  const noPost = await POST('/api/v1/admin/content/posts/00000000-0000-0000-0000-000000000000/take-down', { reason: 'test' });
  assert('不存在費文下架回傳 404', noPost.status === 404);

  // 3i. 內容統計
  const stats = await GET('/api/v1/admin/content/stats');
  assert('內容統計回傳 200', stats.status === 200);
  assert('totalPosts >= 5', stats.data?.totalPosts >= 5);
  assert('包含 pendingReports', typeof stats.data?.pendingReports === 'number');
  assert('包含 resolvedReports', typeof stats.data?.resolvedReports === 'number');
  assert('包含 takenDownCount', typeof stats.data?.takenDownCount === 'number');
}

async function testSystemMonitor() {
  console.log('\n\x1b[1m🖥️  4. 系統監控測試\x1b[0m');

  // 4a. 系統健康
  const health = await GET('/api/v1/admin/system/health');
  assert('系統健康回傳 200', health.status === 200);
  assert('overall status = healthy', health.data?.status === 'healthy');
  assert('Redis status = healthy', health.data?.services?.redis?.status === 'healthy');
  assert('Database status = healthy', health.data?.services?.database?.status === 'healthy');
  assert('Redis latencyMs 為數字', typeof health.data?.services?.redis?.latencyMs === 'number');
  assert('包含 timestamp', !!health.data?.timestamp);

  // 4b. Kafka 狀態（db-writer 未啟動，預期 unknown）
  const kafka = await GET('/api/v1/admin/system/kafka');
  assert('Kafka 狀態回傳 200', kafka.status === 200);
  assert('Kafka status 有值', !!kafka.data?.status);
  assert('包含 timestamp', !!kafka.data?.timestamp);

  // 4c. DLQ 統計（db-writer 未啟動，預期 error）
  const dlq = await GET('/api/v1/admin/system/dlq');
  assert('DLQ 統計回傳 200', dlq.status === 200);

  // 4d. 一致性指標
  const consistency = await GET('/api/v1/admin/system/consistency');
  assert('一致性指標回傳 200', consistency.status === 200);
}

async function testAnalytics() {
  console.log('\n\x1b[1m📊 5. 數據分析測試\x1b[0m');

  // 5a. DAU/MAU
  const dauMau = await GET('/api/v1/admin/analytics/dau-mau?days=7');
  assert('DAU/MAU 回傳 200', dauMau.status === 200);
  assert('dau >= 3（今日 3 人活躍）', dauMau.data?.dau >= 3);
  assert('mau >= 1', dauMau.data?.mau >= 1);
  assert('dauMauRatio 為數字', typeof dauMau.data?.dauMauRatio === 'number');
  assert('dailyDau 為陣列', Array.isArray(dauMau.data?.dailyDau));
  assert('dailyDau 長度 = 7', dauMau.data?.dailyDau?.length === 7);
  assert('包含 calculatedAt', !!dauMau.data?.calculatedAt);

  // 5b. 創作者營收排行
  const revenue = await GET('/api/v1/admin/analytics/creator-revenue?limit=5');
  assert('創作者營收回傳 200', revenue.status === 200);
  assert('回傳陣列', Array.isArray(revenue.data));
  assert('排行至少 2 筆', revenue.data?.length >= 2);
  assert('第一名為 Alice (175元)', revenue.data?.[0]?.displayName === 'Alice Creator');
  assert('包含 totalRevenue', typeof revenue.data?.[0]?.totalRevenue === 'number');
  assert('包含 tipCount', typeof revenue.data?.[0]?.tipCount === 'number');

  // 5c. 熱門內容
  const popular = await GET('/api/v1/admin/analytics/popular-content?limit=5');
  assert('熱門內容回傳 200', popular.status === 200);
  assert('回傳陣列', Array.isArray(popular.data));
  assert('至少 5 筆', popular.data?.length >= 5);
  assert('第一名 engagement 最高', popular.data?.[0]?.engagement >= popular.data?.[1]?.engagement);
  assert('包含 postId', !!popular.data?.[0]?.postId);
  assert('包含 caption', popular.data?.[0]?.caption !== undefined);

  // 5d. 訂閱流失率
  const churn = await GET('/api/v1/admin/analytics/churn-rate?period=month');
  assert('流失率回傳 200', churn.status === 200);
  assert('period = month', churn.data?.period === 'month');
  assert('包含 activeAtStart', typeof churn.data?.activeAtStart === 'number');
  assert('包含 cancelledDuring', typeof churn.data?.cancelledDuring === 'number');
  assert('包含 churnRate', typeof churn.data?.churnRate === 'number');
  assert('包含 currentActive', typeof churn.data?.currentActive === 'number');

  // 5e. 不同 period
  const weekChurn = await GET('/api/v1/admin/analytics/churn-rate?period=week');
  assert('week 流失率回傳 200', weekChurn.status === 200);
  assert('period = week', weekChurn.data?.period === 'week');
}

async function testPagination() {
  console.log('\n\x1b[1m📄 6. 分頁測試\x1b[0m');

  const page1 = await GET('/api/v1/admin/users?page=1&limit=2');
  assert('分頁 limit=2 回傳 2 筆', page1.data?.data?.length === 2);
  assert('page = 1', page1.data?.page === 1);

  const page2 = await GET('/api/v1/admin/users?page=2&limit=2');
  assert('第二頁有資料', page2.data?.data?.length >= 1);
  assert('page = 2', page2.data?.page === 2);

  // IDs should be different between pages
  const page1Ids = page1.data?.data?.map(u => u.id);
  const page2Ids = page2.data?.data?.map(u => u.id);
  assert('不同頁資料不重複', !page1Ids?.some(id => page2Ids?.includes(id)));
}

async function testEdgeCases() {
  console.log('\n\x1b[1m🔧 7. 邊界案例測試\x1b[0m');

  // 7a. 大頁數（超出範圍）
  const bigPage = await GET('/api/v1/admin/users?page=9999&limit=10');
  assert('超大頁數回傳空 data', bigPage.data?.data?.length === 0);
  assert('total 不受影響', bigPage.data?.total >= 5);

  // 7b. 重複停用
  const userId = '33333333-3333-3333-3333-333333333333';
  await POST(`/api/v1/admin/users/${userId}/disable`);
  const again = await POST(`/api/v1/admin/users/${userId}/disable`);
  assert('重複停用不報錯', again.data?.success === true);
  await POST(`/api/v1/admin/users/${userId}/enable`); // cleanup

  // 7c. 重複恢復
  const postId = 'aaaa0001-0001-0001-0001-000000000001';
  const reinstate = await POST(`/api/v1/admin/content/posts/${postId}/reinstate`);
  assert('恢復未下架費文不報錯', reinstate.data?.success === true);

  // 7d. Analytics caching — 第二次請求應更快（from cache）
  const start1 = Date.now();
  await GET('/api/v1/admin/analytics/dau-mau?days=7');
  const time1 = Date.now() - start1;

  const start2 = Date.now();
  await GET('/api/v1/admin/analytics/dau-mau?days=7');
  const time2 = Date.now() - start2;
  assert(`Analytics 快取有效 (${time1}ms → ${time2}ms)`, time2 <= time1 + 50);
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[36m║   Admin Panel E2E 自動化測試              ║\x1b[0m');
  console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');

  try {
    await seedDatabase();

    await testLogin();
    await testUserManagement();
    await testContentModeration();
    await testSystemMonitor();
    await testAnalytics();
    await testPagination();
    await testEdgeCases();

    console.log('\n\x1b[1m═══════════════════════════════════════════\x1b[0m');
    console.log(`\x1b[1m  結果: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} failed\x1b[0m, ${passed + failed} total`);
    console.log('\x1b[1m═══════════════════════════════════════════\x1b[0m\n');

    if (failed > 0) {
      console.log('\x1b[31mFailed tests:\x1b[0m');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ✗ ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
      });
      console.log('');
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n\x1b[31m❌ Fatal error:\x1b[0m', err.message || err);
    process.exit(2);
  }
}

main();
