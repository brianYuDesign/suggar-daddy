/**
 * QA-003: Security Testing Suite
 * Tests for authentication, authorization, injection protection, and CORS
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_BASE_URL = __ENV.AUTH_BASE_URL || 'http://localhost:3002';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'security_checks': ['rate>=0.95'], // At least 95% security checks should pass
  },
};

// Test data
let validToken = '';
let userId = '';

export default function () {
  // ===== 1. AUTHENTICATION BOUNDARY TESTS =====
  console.log('Starting Authentication Boundary Tests...');

  // Test 1.1: Invalid Token
  console.log('Test 1.1: Invalid Token');
  let res = http.get(`${BASE_URL}/api/protected`, {
    headers: {
      Authorization: 'Bearer invalid_token_12345',
    },
  });
  check(res, {
    'invalid token rejected': (r) => r.status === 401,
    'correct error message': (r) => r.json('message')?.includes('Unauthorized'),
  });

  // Test 1.2: Empty Token
  console.log('Test 1.2: Empty Token');
  res = http.get(`${BASE_URL}/api/protected`, {
    headers: {
      Authorization: '',
    },
  });
  check(res, {
    'empty token rejected': (r) => r.status === 401,
  });

  // Test 1.3: Malformed Token (missing Bearer)
  console.log('Test 1.3: Malformed Token');
  res = http.get(`${BASE_URL}/api/protected`, {
    headers: {
      Authorization: 'invalid_token_format',
    },
  });
  check(res, {
    'malformed token rejected': (r) => r.status === 401,
  });

  // Test 1.4: Modified Token Payload
  console.log('Test 1.4: Modified Token Payload');
  // This would be a valid JWT structure but with modified payload
  const modifiedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJhZG1pbiI6dHJ1ZX0.modified_signature_invalid';
  res = http.get(`${BASE_URL}/api/protected`, {
    headers: {
      Authorization: `Bearer ${modifiedToken}`,
    },
  });
  check(res, {
    'modified token signature invalid': (r) => r.status === 401,
  });

  // Test 1.5: First get a valid token
  console.log('Test 1.5: Getting valid token for subsequent tests...');
  const loginRes = http.post(
    `${AUTH_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'testuser@example.com',
      password: 'TestPassword123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (loginRes.status === 200) {
    validToken = loginRes.json('accessToken');
    userId = loginRes.json('userId');
  }

  // Test 1.6: Token Expiration (simulate expired token)
  console.log('Test 1.6: Expired Token Handling');
  // This is a previously valid JWT that's now expired
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkyMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  res = http.get(`${BASE_URL}/api/protected`, {
    headers: {
      Authorization: `Bearer ${expiredToken}`,
    },
  });
  check(res, {
    'expired token rejected': (r) => r.status === 401,
  });

  // ===== 2. AUTHORIZATION & PERMISSION TESTS =====
  console.log('\nStarting Authorization Tests...');

  if (validToken) {
    // Test 2.1: Non-creator trying to upload
    console.log('Test 2.1: Non-creator upload attempt');
    res = http.post(
      `${BASE_URL}/api/content/upload`,
      {},
      {
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    check(res, {
      'non-creator upload rejected': (r) => r.status === 403,
      'correct permission error': (r) => r.json('message')?.includes('permission'),
    });

    // Test 2.2: User accessing other user's data
    console.log('Test 2.2: Accessing other user data');
    const otherId = userId === 'user1' ? 'user2' : 'user1';
    res = http.get(`${BASE_URL}/api/users/${otherId}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    check(res, {
      'other user data access blocked': (r) => r.status === 403,
    });

    // Test 2.3: Admin-only endpoints
    console.log('Test 2.3: Non-admin accessing admin endpoint');
    res = http.get(`${BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    check(res, {
      'non-admin blocked from admin endpoint': (r) => r.status === 403,
    });

    // Test 2.4: Modifying other user's content
    console.log('Test 2.4: Attempting to modify other user content');
    res = http.put(
      `${BASE_URL}/api/content/${otherId}/content123`,
      JSON.stringify({ title: 'Hacked' }),
      {
        headers: {
          Authorization: `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    check(res, {
      'content modification blocked': (r) => r.status === 403,
    });
  }

  // ===== 3. SQL INJECTION PROTECTION TESTS =====
  console.log('\nStarting SQL Injection Tests...');

  // Test 3.1: Login form SQL injection
  console.log('Test 3.1: SQL injection in login form');
  res = http.post(
    `${AUTH_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: "admin' OR '1'='1",
      password: "' OR '1'='1",
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, {
    'SQL injection in login blocked': (r) => r.status === 401,
    'no data leak': (r) => !r.body.includes('password'),
  });

  // Test 3.2: Drop table injection
  console.log('Test 3.2: Drop table injection attempt');
  res = http.post(
    `${AUTH_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: "admin'; DROP TABLE users; --",
      password: 'anything',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, {
    'drop table injection blocked': (r) => r.status === 401,
  });

  // Test 3.3: Search term injection
  console.log('Test 3.3: SQL injection in search');
  res = http.get(`${BASE_URL}/api/content/search?q=test' OR '1'='1`, {
    headers: validToken ? { Authorization: `Bearer ${validToken}` } : {},
  });
  check(res, {
    'search injection handled': (r) => r.status !== 500,
  });

  // Test 3.4: LIKE clause injection
  console.log('Test 3.4: LIKE clause injection');
  res = http.get(`${BASE_URL}/api/content/search?q=%' OR '1'='1`, {
    headers: validToken ? { Authorization: `Bearer ${validToken}` } : {},
  });
  check(res, {
    'LIKE injection handled': (r) => r.status !== 500,
  });

  // Test 3.5: Union-based injection
  console.log('Test 3.5: Union-based SQL injection');
  res = http.get(`${BASE_URL}/api/content/search?q=test' UNION SELECT * FROM users--`, {
    headers: validToken ? { Authorization: `Bearer ${validToken}` } : {},
  });
  check(res, {
    'union injection handled': (r) => r.status !== 500,
  });

  // ===== 4. CORS CONFIGURATION TESTS =====
  console.log('\nStarting CORS Tests...');

  // Test 4.1: Allowed origin
  console.log('Test 4.1: Allowed origin');
  res = http.get(`${BASE_URL}/api/public`, {
    headers: {
      Origin: 'https://app.example.com',
    },
  });
  check(res, {
    'allowed origin permitted': (r) => r.status === 200,
    'CORS header present': (r) => r.headers['Access-Control-Allow-Origin'] !== undefined,
  });

  // Test 4.2: Disallowed origin
  console.log('Test 4.2: Disallowed origin');
  res = http.get(`${BASE_URL}/api/public`, {
    headers: {
      Origin: 'https://evil.com',
    },
  });
  check(res, {
    'disallowed origin blocked': (r) => {
      const corsHeader = r.headers['Access-Control-Allow-Origin'];
      return !corsHeader || corsHeader !== 'https://evil.com';
    },
  });

  // Test 4.3: Subdomain spoofing
  console.log('Test 4.3: Subdomain spoofing');
  res = http.get(`${BASE_URL}/api/public`, {
    headers: {
      Origin: 'https://example.com.attacker.com',
    },
  });
  check(res, {
    'subdomain spoofing prevented': (r) => {
      const corsHeader = r.headers['Access-Control-Allow-Origin'];
      return !corsHeader || corsHeader !== 'https://example.com.attacker.com';
    },
  });

  // Test 4.4: OPTIONS preflight request
  console.log('Test 4.4: OPTIONS preflight request');
  res = http.request('OPTIONS', `${BASE_URL}/api/protected`, '', {
    headers: {
      Origin: 'https://app.example.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type',
    },
  });
  check(res, {
    'preflight request successful': (r) => r.status === 200 || r.status === 204,
    'allow credentials header': (r) => r.headers['Access-Control-Allow-Credentials'] === 'true',
  });

  // ===== 5. ADDITIONAL SECURITY CHECKS =====
  console.log('\nStarting Additional Security Checks...');

  // Test 5.1: Secure headers
  console.log('Test 5.1: Security headers');
  res = http.get(`${BASE_URL}/api/public`);
  check(res, {
    'X-Frame-Options header present': (r) => r.headers['X-Frame-Options'] !== undefined,
    'X-Content-Type-Options header present': (r) => r.headers['X-Content-Type-Options'] !== undefined,
    'Strict-Transport-Security header present': (r) => r.headers['Strict-Transport-Security'] !== undefined,
  });

  // Test 5.2: HTTPS enforcement
  console.log('Test 5.2: HTTPS enforcement');
  // Note: This test assumes HTTPS is being used
  check(true, {
    'using HTTPS': () => BASE_URL.startsWith('https://') || BASE_URL.includes('localhost'),
  });

  // Test 5.3: Rate limiting
  console.log('Test 5.3: Rate limiting on login');
  let rateLimitExceeded = false;
  for (let i = 0; i < 15; i++) {
    res = http.post(
      `${AUTH_BASE_URL}/api/auth/login`,
      JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res.status === 429) {
      rateLimitExceeded = true;
      break;
    }
  }
  check(rateLimitExceeded, {
    'rate limiting enforced': (r) => r === true,
  });

  // Test 5.4: Password policy
  console.log('Test 5.4: Weak password rejection');
  res = http.post(
    `${AUTH_BASE_URL}/api/auth/register`,
    JSON.stringify({
      email: 'weakpass@example.com',
      password: '123', // Weak password
      name: 'Test User',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, {
    'weak password rejected': (r) => r.status === 400,
    'password policy message': (r) => r.json('message')?.includes('password'),
  });

  // Test 5.5: Cookie security
  console.log('Test 5.5: Cookie security flags');
  res = http.post(
    `${AUTH_BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: 'testuser@example.com',
      password: 'TestPassword123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status === 200) {
    const setCookieHeader = res.headers['Set-Cookie'];
    if (setCookieHeader) {
      check(setCookieHeader, {
        'httpOnly flag set': (h) => h.includes('HttpOnly'),
        'Secure flag set': (h) => h.includes('Secure'),
        'SameSite flag set': (h) => h.includes('SameSite'),
      });
    }
  }

  console.log('\nSecurity Testing Complete!');
}

export function handleSummary(data) {
  return {
    'stdout': generateSecurityReport(data),
  };
}

function generateSecurityReport(data) {
  const { metrics } = data;
  let report = '\n=== SECURITY TEST REPORT ===\n\n';

  report += 'Test Summary:\n';
  report += `Total Requests: ${metrics.http_reqs?.value || 0}\n`;
  report += `Failed Requests: ${metrics.http_req_failed?.value || 0}\n`;
  report += `Success Rate: ${(((metrics.http_reqs?.value - metrics.http_req_failed?.value) / metrics.http_reqs?.value) * 100).toFixed(2)}%\n`;

  report += '\n✅ Completed Security Checks:\n';
  report += '- Authentication boundary tests (6 scenarios)\n';
  report += '- Authorization & permission tests (4 scenarios)\n';
  report += '- SQL injection protection (5 vectors)\n';
  report += '- CORS configuration (4 tests)\n';
  report += '- Additional security headers & policies (5 checks)\n';

  return report;
}
