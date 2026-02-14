#!/usr/bin/env node

/**
 * E2E Business Flow Test Script
 * 測試三種角色的完整業務流程
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const API_BASE_URL = 'http://localhost:3000/api';
const TEST_REPORT_DIR = './test-reports';

// 測試結果收集
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  apiCalls: []
};

// 測試數據存儲
const testData = {
  creator: {},
  subscriber: {},
  admin: {},
  posts: [],
  tiers: [],
  subscriptions: []
};

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function logTest(name) {
  log(`\n📋 測試: ${name}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
  testResults.passed++;
}

function logError(message, error) {
  log(`❌ ${message}`, 'red');
  if (error) {
    console.error(error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
  testResults.failed++;
  testResults.errors.push({ message, error: error?.message, details: error?.response?.data });
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// HTTP 請求封裝
async function apiCall(method, endpoint, data = null, token = null, expectedStatus = null) {
  testResults.total++;
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    method,
    url,
    headers: {}
  };

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    if (method === 'GET') {
      config.params = data;
    } else {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
  }

  const startTime = Date.now();
  
  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    // 記錄 API 調用
    testResults.apiCalls.push({
      method,
      endpoint,
      status: response.status,
      duration,
      success: true,
      timestamp: new Date().toISOString()
    });

    log(`${method} ${endpoint} - ${response.status} (${duration}ms)`, 'green');
    
    // 驗證預期狀態碼
    if (expectedStatus && response.status !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
    }
    
    return response.data;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    testResults.apiCalls.push({
      method,
      endpoint,
      status: error.response?.status || 'ERROR',
      duration,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    log(`${method} ${endpoint} - FAILED (${duration}ms)`, 'red');
    throw error;
  }
}

// ========================================
// 角色 1: 內容創作者 (Creator)
// ========================================

async function testCreatorFlow() {
  logSection('🎨 角色 1: 內容創作者 (Creator) - 業務流程測試');

  try {
    // 1. 註冊
    logTest('創作者註冊');
    try {
      const registerData = await apiCall('POST', '/auth/register', {
        email: 'creator@test.com',
        password: 'Creator123!',
        username: 'creator_test',
        role: 'CREATOR'
      }, null, 201);
      
      testData.creator = registerData;
      logSuccess('創作者註冊成功');
      console.log('User ID:', registerData.user?.id || registerData.id);
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        logWarning('創作者已存在，嘗試登入');
      } else {
        throw error;
      }
    }

    // 2. 登入
    logTest('創作者登入');
    try {
      const loginData = await apiCall('POST', '/auth/login', {
        email: 'creator@test.com',
        password: 'Creator123!'
      }, null, 200);
      
      testData.creator.token = loginData.access_token || loginData.accessToken || loginData.token;
      testData.creator.userId = loginData.user?.id || loginData.userId || loginData.id;
      
      if (!testData.creator.token) {
        throw new Error('未獲取到 token');
      }
      
      logSuccess('創作者登入成功');
      console.log('Token:', testData.creator.token.substring(0, 20) + '...');
    } catch (error) {
      logError('創作者登入失敗', error);
      return;
    }

    // 3. 創建訂閱層級
    logTest('創建訂閱層級');
    const tiers = [
      { name: 'Basic', price: 5, description: '基礎訂閱' },
      { name: 'Standard', price: 10, description: '標準訂閱' },
      { name: 'Premium', price: 20, description: '高級訂閱' }
    ];

    for (const tier of tiers) {
      try {
        const tierData = await apiCall('POST', '/subscription-tiers', tier, testData.creator.token, 201);
        testData.tiers.push(tierData);
        logSuccess(`創建層級: ${tier.name} - $${tier.price}`);
      } catch (error) {
        logError(`創建層級失敗: ${tier.name}`, error);
      }
    }

    // 4. 查看訂閱層級列表
    logTest('查看訂閱層級列表');
    try {
      const tiersData = await apiCall('GET', '/subscription-tiers', 
        { creatorId: testData.creator.userId }, 
        testData.creator.token, 200);
      logSuccess(`獲取到 ${tiersData.length || tiersData.data?.length || 0} 個訂閱層級`);
    } catch (error) {
      logError('獲取訂閱層級失敗', error);
    }

    // 5. 發布文字內容
    logTest('發布文字內容');
    try {
      const postData = await apiCall('POST', '/posts', {
        title: '我的第一篇創作',
        content: '這是一篇測試內容，歡迎大家訂閱支持！',
        type: 'TEXT',
        visibility: 'PUBLIC'
      }, testData.creator.token, 201);
      
      testData.posts.push(postData);
      logSuccess('發布文字內容成功');
      console.log('Post ID:', postData.id);
    } catch (error) {
      logError('發布文字內容失敗', error);
    }

    // 6. 模擬上傳圖片
    logTest('模擬上傳圖片');
    try {
      // 創建 mock 圖片數據
      const mockImageData = await apiCall('POST', '/media/upload', {
        fileName: 'test-image.jpg',
        fileType: 'image/jpeg',
        fileSize: 1024000,
        mock: true // 標記為 mock 請求
      }, testData.creator.token);
      
      logSuccess('模擬上傳圖片成功');
      console.log('Media URL:', mockImageData.url || mockImageData.mediaUrl || 'mock-url');
    } catch (error) {
      logError('模擬上傳圖片失敗', error);
    }

    // 7. 發布含媒體的內容
    logTest('發布含媒體的內容');
    try {
      const mediaPostData = await apiCall('POST', '/posts', {
        title: '精彩圖片分享',
        content: '看看這張精彩的圖片！',
        type: 'IMAGE',
        mediaUrl: 'https://mock-s3.example.com/test-image.jpg',
        visibility: 'SUBSCRIBERS_ONLY',
        tierId: testData.tiers[0]?.id
      }, testData.creator.token, 201);
      
      testData.posts.push(mediaPostData);
      logSuccess('發布含媒體的內容成功');
    } catch (error) {
      logError('發布含媒體的內容失敗', error);
    }

    // 8. 查看內容列表
    logTest('查看內容列表');
    try {
      const postsData = await apiCall('GET', '/posts', 
        { creatorId: testData.creator.userId }, 
        testData.creator.token, 200);
      logSuccess(`獲取到 ${postsData.length || postsData.data?.length || 0} 篇內容`);
    } catch (error) {
      logError('獲取內容列表失敗', error);
    }

    // 9. 查看收益統計
    logTest('查看收益統計');
    try {
      const transactionsData = await apiCall('GET', '/transactions', 
        { userId: testData.creator.userId }, 
        testData.creator.token, 200);
      logSuccess('獲取收益統計成功');
      console.log('交易記錄數:', transactionsData.length || transactionsData.data?.length || 0);
    } catch (error) {
      logError('獲取收益統計失敗', error);
    }

  } catch (error) {
    logError('創作者流程測試發生錯誤', error);
  }
}

// ========================================
// 角色 2: 訂閱用戶 (Subscriber)
// ========================================

async function testSubscriberFlow() {
  logSection('👤 角色 2: 訂閱用戶 (Subscriber) - 業務流程測試');

  try {
    // 1. 註冊
    logTest('訂閱用戶註冊');
    try {
      const registerData = await apiCall('POST', '/auth/register', {
        email: 'subscriber@test.com',
        password: 'Subscriber123!',
        username: 'subscriber_test',
        role: 'SUBSCRIBER'
      }, null, 201);
      
      testData.subscriber = registerData;
      logSuccess('訂閱用戶註冊成功');
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        logWarning('訂閱用戶已存在，嘗試登入');
      } else {
        throw error;
      }
    }

    // 2. 登入
    logTest('訂閱用戶登入');
    try {
      const loginData = await apiCall('POST', '/auth/login', {
        email: 'subscriber@test.com',
        password: 'Subscriber123!'
      }, null, 200);
      
      testData.subscriber.token = loginData.access_token || loginData.accessToken || loginData.token;
      testData.subscriber.userId = loginData.user?.id || loginData.userId || loginData.id;
      
      if (!testData.subscriber.token) {
        throw new Error('未獲取到 token');
      }
      
      logSuccess('訂閱用戶登入成功');
    } catch (error) {
      logError('訂閱用戶登入失敗', error);
      return;
    }

    // 3. 瀏覽創作者列表
    logTest('瀏覽創作者列表');
    try {
      const creatorsData = await apiCall('GET', '/users', 
        { role: 'CREATOR' }, 
        testData.subscriber.token, 200);
      logSuccess(`找到 ${creatorsData.length || creatorsData.data?.length || 0} 位創作者`);
    } catch (error) {
      logError('瀏覽創作者列表失敗', error);
    }

    // 4. 查看創作者詳情
    if (testData.creator.userId) {
      logTest('查看創作者詳情');
      try {
        const creatorDetail = await apiCall('GET', `/users/${testData.creator.userId}`, 
          null, 
          testData.subscriber.token, 200);
        logSuccess('獲取創作者詳情成功');
        console.log('創作者:', creatorDetail.username || creatorDetail.email);
      } catch (error) {
        logError('獲取創作者詳情失敗', error);
      }
    }

    // 5. 查看訂閱層級
    if (testData.creator.userId) {
      logTest('查看訂閱層級');
      try {
        const tiersData = await apiCall('GET', '/subscription-tiers', 
          { creatorId: testData.creator.userId }, 
          testData.subscriber.token, 200);
        logSuccess(`找到 ${tiersData.length || tiersData.data?.length || 0} 個訂閱層級`);
      } catch (error) {
        logError('查看訂閱層級失敗', error);
      }
    }

    // 6. 創建訂閱（模擬 Stripe）
    if (testData.tiers.length > 0) {
      logTest('創建訂閱（模擬支付）');
      try {
        const subscriptionData = await apiCall('POST', '/subscriptions', {
          tierId: testData.tiers[0].id,
          paymentMethod: 'stripe',
          mockPayment: true // 模擬支付
        }, testData.subscriber.token, 201);
        
        testData.subscriptions.push(subscriptionData);
        logSuccess('創建訂閱成功（模擬支付）');
        console.log('Subscription ID:', subscriptionData.id);
      } catch (error) {
        logError('創建訂閱失敗', error);
      }
    }

    // 7. 查看我的訂閱
    logTest('查看我的訂閱');
    try {
      const mySubscriptions = await apiCall('GET', '/subscriptions/my-subscriptions', 
        null, 
        testData.subscriber.token, 200);
      logSuccess(`當前訂閱數: ${mySubscriptions.length || mySubscriptions.data?.length || 0}`);
    } catch (error) {
      logError('查看我的訂閱失敗', error);
    }

    // 8. 查看已訂閱創作者的內容
    if (testData.creator.userId) {
      logTest('查看已訂閱創作者的內容');
      try {
        const postsData = await apiCall('GET', '/posts', 
          { creatorId: testData.creator.userId }, 
          testData.subscriber.token, 200);
        logSuccess(`可查看 ${postsData.length || postsData.data?.length || 0} 篇內容`);
      } catch (error) {
        logError('查看內容失敗', error);
      }
    }

    // 9. 查看單篇內容
    if (testData.posts.length > 0) {
      logTest('查看單篇內容');
      try {
        const postDetail = await apiCall('GET', `/posts/${testData.posts[0].id}`, 
          null, 
          testData.subscriber.token, 200);
        logSuccess('查看單篇內容成功');
        console.log('標題:', postDetail.title);
      } catch (error) {
        logError('查看單篇內容失敗', error);
      }
    }

    // 10. 打賞創作者
    if (testData.creator.userId) {
      logTest('打賞創作者');
      try {
        const tipData = await apiCall('POST', '/tips', {
          creatorId: testData.creator.userId,
          amount: 10,
          message: '感謝你的精彩內容！',
          mockPayment: true // 模擬支付
        }, testData.subscriber.token, 201);
        
        logSuccess('打賞成功（模擬支付）');
        console.log('打賞金額: $10');
      } catch (error) {
        logError('打賞失敗', error);
      }
    }

  } catch (error) {
    logError('訂閱用戶流程測試發生錯誤', error);
  }
}

// ========================================
// 角色 3: 運營人員 (Admin)
// ========================================

async function testAdminFlow() {
  logSection('👮 角色 3: 運營人員 (Admin) - 業務流程測試');

  try {
    // 1. 註冊管理員
    logTest('管理員註冊');
    try {
      const registerData = await apiCall('POST', '/auth/register', {
        email: 'admin@test.com',
        password: 'Admin123!',
        username: 'admin_test',
        role: 'ADMIN'
      }, null, 201);
      
      testData.admin = registerData;
      logSuccess('管理員註冊成功');
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        logWarning('管理員已存在，嘗試登入');
      } else {
        throw error;
      }
    }

    // 2. 登入
    logTest('管理員登入');
    try {
      const loginData = await apiCall('POST', '/auth/login', {
        email: 'admin@test.com',
        password: 'Admin123!'
      }, null, 200);
      
      testData.admin.token = loginData.access_token || loginData.accessToken || loginData.token;
      testData.admin.userId = loginData.user?.id || loginData.userId || loginData.id;
      
      if (!testData.admin.token) {
        throw new Error('未獲取到 token');
      }
      
      logSuccess('管理員登入成功');
    } catch (error) {
      logError('管理員登入失敗', error);
      return;
    }

    // 3. 查看所有用戶
    logTest('查看所有用戶');
    try {
      const usersData = await apiCall('GET', '/users', 
        null, 
        testData.admin.token, 200);
      logSuccess(`平台用戶總數: ${usersData.length || usersData.data?.length || 0}`);
    } catch (error) {
      logError('查看所有用戶失敗', error);
    }

    // 4. 查看所有訂閱
    logTest('查看所有訂閱');
    try {
      const subscriptionsData = await apiCall('GET', '/subscriptions', 
        null, 
        testData.admin.token, 200);
      logSuccess(`平台訂閱總數: ${subscriptionsData.length || subscriptionsData.data?.length || 0}`);
    } catch (error) {
      logError('查看所有訂閱失敗', error);
    }

    // 5. 查看所有交易
    logTest('查看所有交易');
    try {
      const transactionsData = await apiCall('GET', '/transactions', 
        null, 
        testData.admin.token, 200);
      logSuccess(`平台交易總數: ${transactionsData.length || transactionsData.data?.length || 0}`);
    } catch (error) {
      logError('查看所有交易失敗', error);
    }

    // 6. 查看用戶詳情
    if (testData.creator.userId) {
      logTest('查看用戶詳情');
      try {
        const userDetail = await apiCall('GET', `/users/${testData.creator.userId}`, 
          null, 
          testData.admin.token, 200);
        logSuccess('獲取用戶詳情成功');
        console.log('用戶:', userDetail.email || userDetail.username);
      } catch (error) {
        logError('獲取用戶詳情失敗', error);
      }
    }

    // 7. 更新用戶狀態
    if (testData.creator.userId) {
      logTest('更新用戶狀態');
      try {
        const updatedUser = await apiCall('PATCH', `/users/${testData.creator.userId}`, {
          status: 'ACTIVE'
        }, testData.admin.token, 200);
        logSuccess('更新用戶狀態成功');
      } catch (error) {
        logError('更新用戶狀態失敗', error);
      }
    }

    // 8. 查看所有內容
    logTest('查看所有內容');
    try {
      const postsData = await apiCall('GET', '/posts', 
        null, 
        testData.admin.token, 200);
      logSuccess(`平台內容總數: ${postsData.length || postsData.data?.length || 0}`);
    } catch (error) {
      logError('查看所有內容失敗', error);
    }

    // 9. 審核內容
    if (testData.posts.length > 0) {
      logTest('審核內容');
      try {
        const reviewedPost = await apiCall('PATCH', `/posts/${testData.posts[0].id}`, {
          status: 'APPROVED',
          reviewNote: '內容符合平台規範'
        }, testData.admin.token, 200);
        logSuccess('審核內容成功');
      } catch (error) {
        logError('審核內容失敗', error);
      }
    }

  } catch (error) {
    logError('管理員流程測試發生錯誤', error);
  }
}

// ========================================
// 錯誤場景測試
// ========================================

async function testErrorScenarios() {
  logSection('⚠️  錯誤場景測試');

  // 1. 未授權訪問
  logTest('未授權訪問受保護的資源');
  try {
    await apiCall('GET', '/posts', null, null, 401);
    logError('未授權訪問應該失敗，但成功了');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('未授權訪問正確返回 401');
    } else {
      logError('未授權訪問返回了錯誤的狀態碼', error);
    }
  }

  // 2. 無效數據
  logTest('提交無效數據');
  try {
    await apiCall('POST', '/auth/register', {
      email: 'invalid-email',
      password: '123' // 密碼太短
    }, null, 400);
    logError('無效數據應該返回 400，但成功了');
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 422) {
      logSuccess('無效數據正確返回錯誤');
    } else {
      logError('無效數據返回了錯誤的狀態碼', error);
    }
  }

  // 3. 重複註冊
  logTest('重複註冊相同郵箱');
  try {
    await apiCall('POST', '/auth/register', {
      email: 'creator@test.com',
      password: 'Creator123!',
      username: 'creator_duplicate',
      role: 'CREATOR'
    }, null, 409);
    logError('重複註冊應該失敗，但成功了');
  } catch (error) {
    if (error.response?.status === 409 || error.response?.status === 400) {
      logSuccess('重複註冊正確返回錯誤');
    } else {
      logError('重複註冊返回了錯誤的狀態碼', error);
    }
  }

  // 4. 訪問不存在的資源
  logTest('訪問不存在的用戶');
  try {
    await apiCall('GET', '/users/99999999', null, testData.admin.token, 404);
    logError('訪問不存在的資源應該返回 404，但成功了');
  } catch (error) {
    if (error.response?.status === 404) {
      logSuccess('訪問不存在的資源正確返回 404');
    } else {
      logError('訪問不存在的資源返回了錯誤的狀態碼', error);
    }
  }

  // 5. 無效 Token
  logTest('使用無效 Token');
  try {
    await apiCall('GET', '/users', null, 'invalid-token-12345', 401);
    logError('無效 Token 應該返回 401，但成功了');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('無效 Token 正確返回 401');
    } else {
      logError('無效 Token 返回了錯誤的狀態碼', error);
    }
  }
}

// ========================================
// 生成測試報告
// ========================================

function generateReport() {
  logSection('📊 測試報告');

  const passRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(2)
    : 0;

  log(`總測試數: ${testResults.total}`, 'cyan');
  log(`通過: ${testResults.passed}`, 'green');
  log(`失敗: ${testResults.failed}`, 'red');
  log(`通過率: ${passRate}%`, passRate >= 80 ? 'green' : 'red');

  // API 調用統計
  console.log('\n📈 API 調用統計:');
  const apiStats = {};
  testResults.apiCalls.forEach(call => {
    const key = `${call.method} ${call.endpoint}`;
    if (!apiStats[key]) {
      apiStats[key] = { total: 0, success: 0, failed: 0, totalDuration: 0 };
    }
    apiStats[key].total++;
    if (call.success) {
      apiStats[key].success++;
    } else {
      apiStats[key].failed++;
    }
    apiStats[key].totalDuration += call.duration;
  });

  Object.entries(apiStats).forEach(([endpoint, stats]) => {
    const avgDuration = (stats.totalDuration / stats.total).toFixed(0);
    const status = stats.failed === 0 ? '✅' : '❌';
    console.log(`  ${status} ${endpoint}`);
    console.log(`     成功: ${stats.success}, 失敗: ${stats.failed}, 平均耗時: ${avgDuration}ms`);
  });

  // 錯誤詳情
  if (testResults.errors.length > 0) {
    console.log('\n❌ 錯誤詳情:');
    testResults.errors.forEach((error, index) => {
      console.log(`\n${index + 1}. ${error.message}`);
      if (error.error) {
        console.log(`   錯誤: ${error.error}`);
      }
      if (error.details) {
        console.log(`   詳情: ${JSON.stringify(error.details, null, 2)}`);
      }
    });
  }

  // 保存報告
  try {
    if (!fs.existsSync(TEST_REPORT_DIR)) {
      fs.mkdirSync(TEST_REPORT_DIR, { recursive: true });
    }

    const reportPath = path.join(TEST_REPORT_DIR, `e2e-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        passRate: `${passRate}%`
      },
      apiCalls: testResults.apiCalls,
      errors: testResults.errors,
      testData: {
        creator: { ...testData.creator, token: '[REDACTED]' },
        subscriber: { ...testData.subscriber, token: '[REDACTED]' },
        admin: { ...testData.admin, token: '[REDACTED]' },
        posts: testData.posts,
        tiers: testData.tiers,
        subscriptions: testData.subscriptions
      }
    }, null, 2));

    log(`\n💾 測試報告已保存: ${reportPath}`, 'cyan');
  } catch (error) {
    logError('保存測試報告失敗', error);
  }

  // 修復建議
  console.log('\n🔧 修復建議:');
  if (testResults.failed === 0) {
    log('所有測試通過！系統運行良好。', 'green');
  } else {
    log('1. 檢查失敗的 API 端點是否已實作', 'yellow');
    log('2. 驗證 JWT token 配置是否正確', 'yellow');
    log('3. 確認資料庫連接和數據持久化', 'yellow');
    log('4. 檢查 Kafka 事件是否正確發送', 'yellow');
    log('5. 驗證 Redis 緩存是否正常工作', 'yellow');
  }
}

// ========================================
// 主測試流程
// ========================================

async function main() {
  log('🚀 開始執行 E2E 業務流程測試', 'cyan');
  log(`測試環境: ${API_BASE_URL}\n`, 'cyan');

  try {
    await testCreatorFlow();
    await testSubscriberFlow();
    await testAdminFlow();
    await testErrorScenarios();
  } catch (error) {
    log('測試執行過程中發生嚴重錯誤', 'red');
    console.error(error);
  }

  generateReport();
  
  log('\n✨ 測試完成', 'cyan');
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 執行測試
main();
