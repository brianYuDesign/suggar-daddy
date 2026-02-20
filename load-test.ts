import http from 'k6/http';
import { check, group, sleep, Counter, Histogram } from 'k6';

// 定義性能指標
const requestDuration = new Histogram('http_req_duration');
const requestErrors = new Counter('http_req_errors');
const recommendationErrors = new Counter('recommendation_errors');
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');

// 配置
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up: 逐漸增加到 10 VUs
    { duration: '3m', target: 50 },   // Peak: 保持 50 VUs
    { duration: '2m', target: 100 },  // High load: 增加到 100 VUs
    { duration: '3m', target: 100 },  // Sustain: 維持高負載
    { duration: '2m', target: 0 },    // Ramp-down: 逐漸減少到 0
  ],
  
  thresholds: {
    // API 響應時間指標
    'http_req_duration': [
      'p(50) < 100',    // 50% 請求 < 100ms
      'p(95) < 300',    // 95% 請求 < 300ms
      'p(99) < 500',    // 99% 請求 < 500ms
      'max < 2000',     // 最大 < 2000ms
    ],
    
    // 錯誤率
    'http_req_failed': ['rate < 0.05'], // 錯誤率 < 5%
    'http_errors': ['count < 10'],       // 總錯誤 < 10
  },
};

/**
 * 推薦 API 性能測試
 */
export function testRecommendationAPI() {
  group('Recommendation API', () => {
    // 獲取用戶列表
    const userIds = generateUserIds(10);
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    // 測試推薦端點
    const res = http.get(
      `http://localhost:3001/recommendations/${userId}?limit=10`
    );

    const startTime = new Date().getTime();
    const duration = new Date().getTime() - startTime;
    requestDuration.add(duration);

    // 檢查響應
    const success = check(res, {
      'Status is 200': (r) => r.status === 200,
      'Response contains recommendations': (r) => r.body.includes('recommendations'),
      'Response time < 500ms': (r) => r.timings.duration < 500,
      'Response time < 1000ms': (r) => r.timings.duration < 1000,
      'Response headers correct': (r) =>
        r.headers['Content-Type'].includes('application/json'),
    });

    if (!success) {
      requestErrors.add(1);
      recommendationErrors.add(1);
    }

    // 檢查快取命中
    const xCacheHeader = res.headers['X-Cache-Hit'];
    if (xCacheHeader === 'true') {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }

    sleep(1);
  });
}

/**
 * 內容 API 性能測試
 */
export function testContentAPI() {
  group('Content API', () => {
    const contentIds = generateContentIds(50);
    const contentId = contentIds[Math.floor(Math.random() * contentIds.length)];

    const res = http.get(
      `http://localhost:3002/content/${contentId}`
    );

    const success = check(res, {
      'Status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'Response time < 200ms': (r) => r.timings.duration < 200,
      'Response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!success) {
      requestErrors.add(1);
    }

    sleep(1);
  });
}

/**
 * 認證 API 性能測試
 */
export function testAuthAPI() {
  group('Auth API', () => {
    const userIds = generateUserIds(10);
    const userId = userIds[Math.floor(Math.random() * userIds.length)];

    const res = http.get(
      `http://localhost:3003/auth/user/${userId}/permissions`
    );

    const success = check(res, {
      'Status is 200': (r) => r.status === 200,
      'Response time < 100ms': (r) => r.timings.duration < 100,
      'Response time < 200ms': (r) => r.timings.duration < 200,
    });

    if (!success) {
      requestErrors.add(1);
    }

    sleep(1);
  });
}

/**
 * 並發壓力測試
 */
export function testConcurrentLoad() {
  group('Concurrent Load Test', () => {
    const batch = http.batch([
      ['GET', `http://localhost:3001/recommendations/user-${__VU}?limit=10`],
      ['GET', `http://localhost:3002/content/content-${__VU}`],
      ['GET', `http://localhost:3003/auth/user/user-${__VU}/permissions`],
    ]);

    batch.forEach((res) => {
      check(res, {
        'Status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
      });
    });

    sleep(1);
  });
}

/**
 * 快取效率測試
 * 模擬多個用戶訪問相同的推薦
 */
export function testCacheEfficiency() {
  group('Cache Efficiency Test', () => {
    // 所有虛擬用戶請求相同的用戶 ID，測試快取效率
    const targetUserId = 'test-user-cache-efficiency';
    
    const res = http.get(
      `http://localhost:3001/recommendations/${targetUserId}?limit=10`
    );

    const isCached = res.headers['X-Cache-Hit'] === 'true';
    
    check(res, {
      'Status is 200': (r) => r.status === 200,
      'Request served': (r) => r.status === 200,
    });

    if (isCached) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }

    sleep(0.5);
  });
}

/**
 * 漸進式負載測試
 * 用於找到系統的臨界點
 */
export function testProgressiveLoad() {
  const userIndex = Math.floor(__VU / 10); // 每 10 個 VU 為一組
  const userId = `user-${userIndex}`;

  const res = http.get(
    `http://localhost:3001/recommendations/${userId}?limit=10`
  );

  check(res, {
    'Status is 200': (r) => r.status === 200,
    'Response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

/**
 * 主測試函數
 */
export default function () {
  const testType = Math.floor(Math.random() * 5);

  switch (testType) {
    case 0:
      testRecommendationAPI();
      break;
    case 1:
      testContentAPI();
      break;
    case 2:
      testAuthAPI();
      break;
    case 3:
      testConcurrentLoad();
      break;
    case 4:
      testCacheEfficiency();
      break;
    default:
      testRecommendationAPI();
  }
}

/**
 * 設置函數 - 在測試前執行
 */
export function setup() {
  console.log('🚀 Starting k6 performance test suite');
  console.log(`⏱️ Test duration: ${options.stages.reduce((acc, s) => acc + parseDuration(s.duration), 0) / 1000}s`);
  
  return {
    startTime: new Date(),
  };
}

/**
 * 清理函數 - 在測試後執行
 */
export function teardown(data) {
  const duration = new Date() - data.startTime;
  console.log(`✅ Test completed in ${duration / 1000}s`);
}

/**
 * 輔助函數 - 生成用戶 ID
 */
function generateUserIds(count) {
  const userIds = [];
  for (let i = 0; i < count; i++) {
    userIds.push(`user-${i}`);
  }
  return userIds;
}

/**
 * 輔助函數 - 生成內容 ID
 */
function generateContentIds(count) {
  const contentIds = [];
  for (let i = 0; i < count; i++) {
    contentIds.push(`content-${i}`);
  }
  return contentIds;
}

/**
 * 輔助函數 - 解析持續時間字符串
 */
function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)([smh])$/);
  if (!match) return 0;
  const [, value, unit] = match;
  const multipliers = { s: 1, m: 60, h: 3600 };
  return parseInt(value) * multipliers[unit];
}
