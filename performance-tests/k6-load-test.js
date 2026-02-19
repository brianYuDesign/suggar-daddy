import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const apiDuration = new Trend('api_duration');
const loginDuration = new Trend('login_duration');
const recommendationDuration = new Trend('recommendation_duration');
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const paymentDuration = new Trend('payment_duration');

// Test configuration
export const options = {
  // Phase 1: Warm up with 10 users for 2 minutes
  // Phase 2: Ramp up to 50 users over 2 minutes
  // Phase 3: Stay at 50 users for 3 minutes
  // Phase 4: Ramp down to 0 users
  stages: [
    { duration: '2m', target: 10, name: 'warmup' },
    { duration: '2m', target: 50, name: 'ramp-up' },
    { duration: '3m', target: 50, name: 'steady-state' },
    { duration: '2m', target: 0, name: 'ramp-down' },
  ],
  
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'], // 95th percentile < 200ms, 99th < 500ms
    'api_duration': ['p(95)<200', 'p(99)<500'],
    'login_duration': ['p(95)<100', 'p(99)<200'],
    'recommendation_duration': ['p(95)<200', 'p(99)<500'],
    'payment_duration': ['p(95)<300', 'p(99)<1000'],
    'errors': ['rate<0.1'], // Error rate < 10%
    'http_req_failed': ['rate<0.1'],
  },
};

// Base URL - adjust based on environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://localhost:3002';
const CONTENT_BASE_URL = __ENV.CONTENT_BASE_URL || 'http://localhost:3001';
const PAYMENT_BASE_URL = __ENV.PAYMENT_BASE_URL || 'http://localhost:3003';
const RECOMMENDATION_BASE_URL = __ENV.RECOMMENDATION_BASE_URL || 'http://localhost:3000';

// Test data generator
function generateTestUser() {
  const uniqueId = Math.random().toString(36).substring(7);
  return {
    email: `testuser_${uniqueId}@example.com`,
    password: 'TestPassword123!',
    name: `Test User ${uniqueId}`,
  };
}

export default function () {
  const testUser = generateTestUser();
  let authToken = null;

  // ===== Authentication Tests =====
  group('Authentication', () => {
    // Test 1: User Registration
    group('User Registration', () => {
      const registerPayload = JSON.stringify({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      });

      const registerRes = http.post(
        `${AUTH_BASE_URL}/api/auth/register`,
        registerPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: '10s',
        }
      );

      check(registerRes, {
        'registration successful': (r) => r.status === 201,
        'response time < 500ms': (r) => r.timings.duration < 500,
      });

      errorRate.add(registerRes.status !== 201);
      successRate.add(registerRes.status === 201);
    });

    sleep(1);

    // Test 2: User Login
    group('User Login', () => {
      const loginPayload = JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      });

      const loginStart = new Date();
      const loginRes = http.post(
        `${AUTH_BASE_URL}/api/auth/login`,
        loginPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: '10s',
        }
      );
      const loginEnd = new Date();

      loginDuration.add(loginEnd - loginStart);

      check(loginRes, {
        'login successful': (r) => r.status === 200,
        'has access token': (r) => r.json('accessToken') !== undefined,
        'has refresh token': (r) => r.json('refreshToken') !== undefined,
        'response time < 100ms': (r) => r.timings.duration < 100,
      });

      if (loginRes.status === 200) {
        authToken = loginRes.json('accessToken');
      }

      errorRate.add(loginRes.status !== 200);
      successRate.add(loginRes.status === 200);
    });
  });

  if (!authToken) {
    return; // Skip further tests if authentication failed
  }

  // ===== Recommendation Service Tests =====
  group('Recommendations', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const recStart = new Date();
    const recRes = http.get(
      `${RECOMMENDATION_BASE_URL}/api/recommendations`,
      { headers, timeout: '10s' }
    );
    const recEnd = new Date();

    recommendationDuration.add(recEnd - recStart);

    check(recRes, {
      'recommendations loaded': (r) => r.status === 200,
      'has recommendations': (r) => r.json('recommendations.length') > 0,
      'response time < 200ms': (r) => r.timings.duration < 200,
    });

    errorRate.add(recRes.status !== 200);
    successRate.add(recRes.status === 200);
  });

  sleep(2);

  // ===== Content Service Tests =====
  group('Content Operations', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // Get featured content
    const contentRes = http.get(
      `${CONTENT_BASE_URL}/api/content/featured`,
      { headers, timeout: '10s' }
    );

    check(contentRes, {
      'featured content loaded': (r) => r.status === 200,
      'has content': (r) => r.json('content.length') > 0,
    });

    errorRate.add(contentRes.status !== 200);
    successRate.add(contentRes.status === 200);
  });

  sleep(1);

  // ===== Payment Service Tests =====
  group('Payment Operations', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // Get subscription plans
    const plansStart = new Date();
    const plansRes = http.get(
      `${PAYMENT_BASE_URL}/api/subscriptions/plans`,
      { headers, timeout: '10s' }
    );
    const plansEnd = new Date();

    check(plansRes, {
      'subscription plans loaded': (r) => r.status === 200,
      'has plans': (r) => r.json('plans.length') > 0,
    });

    errorRate.add(plansRes.status !== 200);
    successRate.add(plansRes.status === 200);

    sleep(1);

    // Check subscription status
    const statusStart = new Date();
    const statusRes = http.get(
      `${PAYMENT_BASE_URL}/api/subscriptions/status`,
      { headers, timeout: '10s' }
    );
    const statusEnd = new Date();

    paymentDuration.add(statusEnd - statusStart);

    check(statusRes, {
      'subscription status retrieved': (r) => r.status === 200,
      'has status field': (r) => r.json('status') !== undefined,
    });

    errorRate.add(statusRes.status !== 200);
    successRate.add(statusRes.status === 200);
  });

  sleep(2);

  // ===== Concurrent Load Test =====
  group('Concurrent Requests', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // Simulate multiple concurrent API calls
    const responses = http.batch([
      {
        method: 'GET',
        url: `${RECOMMENDATION_BASE_URL}/api/recommendations`,
        params: { headers, timeout: '10s' },
      },
      {
        method: 'GET',
        url: `${CONTENT_BASE_URL}/api/content/featured`,
        params: { headers, timeout: '10s' },
      },
      {
        method: 'GET',
        url: `${PAYMENT_BASE_URL}/api/subscriptions/status`,
        params: { headers, timeout: '10s' },
      },
    ]);

    responses.forEach((res) => {
      check(res, {
        'concurrent request successful': (r) => r.status === 200,
      });
      errorRate.add(res.status !== 200);
    });
  });

  sleep(1);
}

// Teardown function to run after all tests
export function teardown(data) {
  console.log('Performance tests completed');
}

// Summary function to display results
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const { metrics, thresholds } = data;

  let summary = `\n${indent}=== Performance Test Summary ===\n`;

  // Key metrics
  summary += `${indent}HTTP Requests:\n`;
  summary += `${indent}  - Total: ${metrics.http_reqs?.value || 0}\n`;
  summary += `${indent}  - Failed: ${metrics.http_req_failed?.value || 0}\n`;
  summary += `${indent}  - Duration (avg): ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'}ms\n`;
  summary += `${indent}  - Duration (p95): ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  summary += `${indent}  - Duration (p99): ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}ms\n`;

  summary += `\n${indent}Custom Metrics:\n`;
  summary += `${indent}  - Login Duration (p95): ${metrics.login_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  summary += `${indent}  - Recommendation Duration (p95): ${metrics.recommendation_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  summary += `${indent}  - Payment Duration (p95): ${metrics.payment_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms\n`;
  summary += `${indent}  - Error Rate: ${((metrics.errors?.value || 0) * 100).toFixed(2)}%\n`;
  summary += `${indent}  - Success Rate: ${((metrics.success?.value || 0) * 100).toFixed(2)}%\n`;

  summary += `\n${indent}Threshold Status:\n`;
  Object.entries(thresholds || {}).forEach(([name, result]) => {
    const status = result?.ok ? '✅ PASS' : '❌ FAIL';
    summary += `${indent}  - ${name}: ${status}\n`;
  });

  return summary;
}
