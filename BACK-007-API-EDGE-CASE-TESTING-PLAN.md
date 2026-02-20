# BACK-007: API Final Testing & Edge Case Handling - Comprehensive Testing Plan

**Project**: Sugar-Daddy Phase 1 Week 4  
**Task ID**: BACK-007  
**Status**: 🚀 In Progress  
**Duration**: 2-3 days  
**Created**: 2026-02-19 13:24 GMT+8

---

## 📋 Executive Summary

This document outlines the comprehensive API testing strategy for BACK-007, focusing on edge cases, boundary conditions, rate limiting, timeouts, error handling, and security vulnerabilities.

**Scope**:
- 6 core services (API Gateway, Auth, Recommendation, Payment, Content Streaming, Subscription)
- 100+ test cases covering edge cases
- Rate limiting validation
- Timeout and retry logic
- Security boundary checks
- Error code standardization

**Success Criteria**:
✅ All edge cases handled correctly  
✅ Rate limiting effective and enforced  
✅ Timeouts and retries working properly  
✅ Error responses standardized  
✅ No security vulnerabilities  
✅ 99%+ API test coverage  

---

## 🎯 Testing Categories

### 1. Edge Cases & Boundary Conditions

#### 1.1 Large File Uploads (>1GB)

**Scenario**: Upload extremely large files to stress-test streaming and memory handling

| Test Case | Input | Expected | Priority |
|-----------|-------|----------|----------|
| Max file upload (1GB) | 1GB video | 413 Payload Too Large | HIGH |
| Chunked upload (100MB chunks) | 5GB in 50x100MB | Success with assembly | HIGH |
| Timeout on slow upload | Upload over 30min | 408 Request Timeout | MEDIUM |
| Malformed chunked upload | Missing chunk | 400 Bad Request | HIGH |
| Resume incomplete upload | Cancel at 50%, resume | Resumes from chunk N | MEDIUM |
| Parallel chunk upload | Upload 5 chunks simultaneously | All chunks processed | MEDIUM |
| Invalid content type | .exe uploaded as .mp4 | 415 Unsupported Media Type | HIGH |
| Zero-byte file | Empty file upload | 400 Bad Request | MEDIUM |

**Test Implementation**:
```bash
# Test 1: Single 1GB file
dd if=/dev/zero of=test-1gb.bin bs=1M count=1024
curl -F "file=@test-1gb.bin" http://localhost:4000/api/upload

# Test 2: Chunked upload with 100MB chunks
node test-chunked-upload.js --file=large-video.mp4 --chunk-size=104857600
```

#### 1.2 Extreme Concurrency (100+ Simultaneous)

**Scenario**: Stress-test API with many concurrent requests

| Test Case | Concurrent | Duration | Expected | Priority |
|-----------|-----------|----------|----------|----------|
| 100 concurrent GET | 100 VU | 5 min | P50 <100ms | HIGH |
| 100 concurrent POST | 100 VU | 5 min | P95 <300ms | HIGH |
| 1000 concurrent reads | 1000 VU | 2 min | No pool exhaustion | HIGH |
| Mixed read/write (80/20) | 500 VU | 10 min | Stable throughput | MEDIUM |
| Connection limit test | 200+ simultaneous | 1 min | 503 Service Unavailable | HIGH |
| Spike test (slow→fast) | 10→1000 VU instantly | 5 min | Graceful degradation | MEDIUM |
| Sustained high load | 500 VU | 30 min | No memory leak | HIGH |
| Bursty traffic pattern | 0→500→0 (10min cycles) | 60 min | Stable recovery | MEDIUM |

**Test Implementation**:
```javascript
// k6 test for concurrent requests
import http from 'k6/http';
import { check, group } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

export default function() {
  group('Concurrent GET requests', function() {
    let response = http.get('http://localhost:3000/api/recommendations/user-123');
    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 100ms': (r) => r.timings.duration < 100,
    });
  });
}
```

#### 1.3 High-Frequency API Calls (Rate Limiting)

**Scenario**: Validate rate limiting is enforced correctly

| Test Case | Requests | Window | Expected | Priority |
|-----------|----------|--------|----------|----------|
| Exceed per-second limit | 1000 req/s | 1s | 429 Too Many Requests | HIGH |
| Exceed per-minute limit | 10,000 req/min | 1 min | 429 after threshold | HIGH |
| Exceed per-hour limit | 1,000,000 req/h | 1 hour | 429 after threshold | MEDIUM |
| Rate limit reset | Hit limit, wait, retry | Succeeds after window | HIGH |
| Rate limit headers | Check X-RateLimit-* | Correct remaining count | HIGH |
| Different endpoints | API calls to 5 endpoints | Each has own limits | MEDIUM |
| Authenticated vs anonymous | Compare rate limits | Auth higher limits | MEDIUM |
| Rate limit bypass attempt | False auth, X-Forwarded-For | Limit still enforced | HIGH |

**Test Implementation**:
```javascript
// Rate limiting test
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  // Test: Exceed per-second limit (1000 req/s)
  for (let i = 0; i < 1000; i++) {
    let response = http.get('http://localhost:3000/api/recommendations/user-123');
    
    if (i < 100) {
      check(response, {
        'First 100 succeed': (r) => r.status === 200,
      });
    } else {
      check(response, {
        'Requests after limit return 429': (r) => r.status === 429,
        'Has Retry-After header': (r) => r.headers['Retry-After'],
      });
    }
  }
}
```

---

### 2. Timeout & Retry Logic

#### 2.1 Slow Query Timeout

**Scenario**: Database queries that take too long should timeout

| Test Case | Query Type | Slow Time | Expected | Priority |
|-----------|-----------|-----------|----------|----------|
| Complex join query | 8-table join | 5s | 408 Request Timeout | HIGH |
| Full table scan | SELECT * FROM users | 10s | 408 Request Timeout | HIGH |
| Expensive aggregation | GROUP BY with subquery | 8s | 408 Request Timeout | MEDIUM |
| Lock wait timeout | Row lock for 30s | 5s timeout | 408 Request Timeout | HIGH |
| Connection timeout | DB down for 5s | 2s timeout | 504 Gateway Timeout | HIGH |
| Query with timeout override | ?timeout=10000 | 10s allowed | Success | MEDIUM |

**Test Implementation**:
```sql
-- Force slow query
SELECT * FROM users u
LEFT JOIN payments p ON u.id = p.user_id
LEFT JOIN contents c ON u.id = c.creator_id
LEFT JOIN interactions i ON c.id = i.content_id
WHERE u.created_at > NOW() - INTERVAL '1 day'
  AND (SELECT COUNT(*) FROM interactions) > 0;
```

#### 2.2 Network Failure & Retry Logic

**Scenario**: Network failures should trigger retries

| Test Case | Failure Type | Retry Count | Expected | Priority |
|-----------|-------------|-----------|----------|----------|
| Connection refused | DB down | 3 retries | Succeeds on recovery | HIGH |
| Network timeout | Latency spike | 3 retries | Exponential backoff | HIGH |
| Partial response | Connection drop mid-response | 2 retries | Complete response | MEDIUM |
| Circuit breaker open | Too many failures | N/A | Fast fail (503) | HIGH |
| Circuit breaker recovery | Errors reduce | 1 success needed | Resume normal | MEDIUM |
| Exponential backoff | Multiple retries | 3 retries | 100ms, 200ms, 400ms | HIGH |
| Max retry timeout | Retries exceed timeout | After 30s | 504 Gateway Timeout | MEDIUM |

**Test Implementation**:
```typescript
// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 100; // 100ms, 200ms, 400ms
      await sleep(delay);
    }
  }
}
```

#### 2.3 Connection Pool Exhaustion

**Scenario**: What happens when connection pool runs out

| Test Case | Pool Size | Connections Used | Expected | Priority |
|-----------|-----------|------------------|----------|----------|
| Normal pool usage | 20 | 10 (50%) | All queries succeed | HIGH |
| High pool usage | 20 | 19 (95%) | Queuing for next | MEDIUM |
| Pool exhaustion | 20 | 21+ | 503 Service Unavailable | HIGH |
| Pool recovery | Pool full→normal | After connection released | Resumes success | HIGH |
| Idle connection timeout | Connection idle 30s | After timeout | Removed from pool | MEDIUM |
| Connection leak detection | Connections not returned | After threshold | Alert + recovery | HIGH |

**Test Implementation**:
```typescript
// Monitor pool exhaustion
const pool = createPool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Simulate exhaustion
for (let i = 0; i < 25; i++) {
  pool.query('SELECT * FROM users').catch(err => {
    if (err.message.includes('timeout')) {
      console.log('Pool exhausted at connection', i);
    }
  });
}
```

---

### 3. Error Codes & Messages Standardization

#### 3.1 HTTP Status Codes

**Scenario**: All error responses use correct HTTP status codes

| Error Type | HTTP Code | Example | Validation |
|-----------|-----------|---------|-----------|
| Bad Request | 400 | Invalid JSON, missing field | Check status + error type |
| Unauthorized | 401 | Missing/invalid JWT token | Check status + www-authenticate |
| Forbidden | 403 | User doesn't have permission | Check status + error message |
| Not Found | 404 | Resource doesn't exist | Check status + resource id |
| Conflict | 409 | Duplicate record, constraint violation | Check status + constraint name |
| Payload Too Large | 413 | File >1GB | Check status + max size |
| Unsupported Media Type | 415 | Invalid content type | Check status + accepted types |
| Too Many Requests | 429 | Rate limit exceeded | Check status + retry-after |
| Internal Error | 500 | Unhandled exception | Check status + error id |
| Not Implemented | 501 | Feature disabled | Check status + feature name |
| Service Unavailable | 503 | Pool exhaustion, circuit open | Check status + retry-after |
| Gateway Timeout | 504 | Query timeout, network timeout | Check status + timeout duration |

**Test Case Template**:
```typescript
it('should return 400 for invalid input', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/recommendations/interactions')
    .send({ user_id: 'user-123' }); // Missing content_id
  
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('error.type', 'VALIDATION_ERROR');
  expect(response.body).toHaveProperty('error.message');
});
```

#### 3.2 Error Response Format

**Standard Format**:
```json
{
  "error": {
    "id": "err_1708252800000_abc123",
    "type": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "status": 400,
    "timestamp": "2026-02-19T13:24:00Z",
    "path": "/api/recommendations/interactions",
    "details": {
      "field": "content_id",
      "reason": "required"
    }
  }
}
```

**Validation Checklist**:
- [ ] Error ID is unique (timestamp + random + hash)
- [ ] Error type matches standard enum
- [ ] Message is clear and actionable
- [ ] Status code matches type
- [ ] Timestamp is ISO 8601 format
- [ ] Path shows which endpoint failed
- [ ] Details contain useful debugging info
- [ ] No sensitive data in error message

#### 3.3 Error Tracking IDs

**Scenario**: Every error has unique tracking ID for debugging

| Test Case | Error Type | Expected ID Format | Validation |
|-----------|-----------|-------------------|-----------|
| Generate tracking ID | Any error | err_TIMESTAMP_HASH | Unique per request |
| Log with tracking ID | 500 error | ID in logs | Can find in logs |
| Return in response | All errors | ID in error object | Client can reference |
| Different per request | Same endpoint hit 2x | Different IDs | Properly generated |
| Consistent format | Across all services | Same format used | Standardized |

**Test Implementation**:
```typescript
it('should include unique error ID in 500 response', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/recommendations/invalid-user'); // Force error
  
  expect(response.status).toBe(500);
  expect(response.body.error.id).toMatch(/^err_\d+_[a-f0-9]+$/);
  
  // Make second request
  const response2 = await request(app.getHttpServer())
    .get('/api/recommendations/invalid-user');
  
  // Should have different tracking ID
  expect(response2.body.error.id).not.toBe(response.body.error.id);
});
```

---

### 4. Security Boundary Tests

#### 4.1 XSS (Cross-Site Scripting) Prevention

**Scenario**: Validate that user input cannot execute scripts

| Test Case | Payload | Field | Expected | Priority |
|-----------|---------|-------|----------|----------|
| Script in title | `<script>alert(1)</script>` | content.title | Escaped/rejected | HIGH |
| Event handler | `<img src=x onerror="alert(1)">` | comment.text | Escaped | HIGH |
| JavaScript URL | `javascript:alert(1)` | user.profile_url | Blocked/escaped | HIGH |
| Data attribute | `<div data-x="alert(1)">` | comment.text | Escaped | MEDIUM |
| SVG vector | `<svg onload="alert(1)">` | content.description | Escaped | HIGH |
| HTML encoding bypass | `&#60;script&#62;` | comment.text | Properly decoded | HIGH |
| Mixed encoding | `%3Cscript%3E` | URL parameter | Validated | MEDIUM |
| Stored XSS validation | Store malicious input | Database | Retrieved escaped | HIGH |

**Test Implementation**:
```typescript
it('should prevent XSS in user input', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/recommendations/interactions/comment')
    .send({
      content_id: 'content-1',
      user_id: 'user-1',
      comment: '<script>alert("xss")</script>'
    });
  
  expect(response.status).toBe(201);
  
  // Retrieve comment and verify escaping
  const getResponse = await request(app.getHttpServer())
    .get('/api/content/content-1/comments');
  
  expect(getResponse.body.comments[0].comment).not.toContain('<script>');
  expect(getResponse.body.comments[0].comment).toContain('&lt;script&gt;');
});
```

#### 4.2 CSRF (Cross-Site Request Forgery) Protection

**Scenario**: Validate CSRF tokens are enforced for state-changing operations

| Test Case | Request Type | CSRF Token | Expected | Priority |
|-----------|-------------|-----------|----------|----------|
| POST without token | POST /recommendations | Missing | 403 Forbidden | HIGH |
| POST with invalid token | POST /recommendations | Invalid | 403 Forbidden | HIGH |
| POST with valid token | POST /recommendations | Valid | 201 Created | HIGH |
| Token per request | 2 consecutive POST | Different tokens | Both succeed | MEDIUM |
| Token timeout | Old token (>1h) | Expired | 403 Forbidden | MEDIUM |
| GET requests exempt | GET /recommendations | N/A | 200 OK | HIGH |
| Custom header bypass | X-CSRF-TOKEN in body | Malformed | 403 Forbidden | HIGH |
| Double submit cookie | CSRF token in cookie + body | Matched | 201 Created | MEDIUM |

**Test Implementation**:
```typescript
it('should enforce CSRF protection on state-changing requests', async () => {
  // GET CSRF token first
  const tokenResponse = await request(app.getHttpServer())
    .get('/api/csrf-token');
  const csrfToken = tokenResponse.body.token;
  
  // POST without token should fail
  const noTokenResponse = await request(app.getHttpServer())
    .post('/api/recommendations/interactions')
    .send({
      user_id: 'user-1',
      content_id: 'content-1',
      interaction_type: 'like'
    });
  expect(noTokenResponse.status).toBe(403);
  
  // POST with token should succeed
  const withTokenResponse = await request(app.getHttpServer())
    .post('/api/recommendations/interactions')
    .set('X-CSRF-Token', csrfToken)
    .send({
      user_id: 'user-1',
      content_id: 'content-1',
      interaction_type: 'like'
    });
  expect(withTokenResponse.status).toBe(201);
});
```

#### 4.3 Authentication Boundary Checks

**Scenario**: Validate authentication is properly enforced

| Test Case | Token Type | Endpoint | Expected | Priority |
|-----------|-----------|----------|----------|----------|
| No token | Missing | Protected | 401 Unauthorized | HIGH |
| Invalid token | Malformed | Protected | 401 Unauthorized | HIGH |
| Expired token | JWT exp < now | Protected | 401 Unauthorized | HIGH |
| Invalid signature | JWT tampered | Protected | 401 Unauthorized | HIGH |
| Wrong user | Token for user-2, access user-1 data | /users/user-1 | 403 Forbidden | HIGH |
| Revoked token | Token in blacklist | Protected | 401 Unauthorized | HIGH |
| Public endpoint | No token | /health, /status | 200 OK | HIGH |
| Bearer format | Invalid header format | Protected | 400 Bad Request | MEDIUM |
| OAuth token | Valid OAuth token | Protected | 200 OK | MEDIUM |
| Service account | Service-to-service auth | Protected | 200 OK | MEDIUM |

**Test Implementation**:
```typescript
it('should require valid authentication', async () => {
  // No token
  const noTokenResponse = await request(app.getHttpServer())
    .get('/api/user/user-123/profile');
  expect(noTokenResponse.status).toBe(401);
  
  // Invalid token
  const invalidTokenResponse = await request(app.getHttpServer())
    .get('/api/user/user-123/profile')
    .set('Authorization', 'Bearer invalid.token.here');
  expect(invalidTokenResponse.status).toBe(401);
  
  // Expired token
  const expiredToken = generateExpiredJWT();
  const expiredResponse = await request(app.getHttpServer())
    .get('/api/user/user-123/profile')
    .set('Authorization', `Bearer ${expiredToken}`);
  expect(expiredResponse.status).toBe(401);
  
  // Valid token
  const validToken = generateValidJWT();
  const validResponse = await request(app.getHttpServer())
    .get('/api/user/user-123/profile')
    .set('Authorization', `Bearer ${validToken}`);
  expect(validResponse.status).toBe(200);
});
```

---

## 📊 Test Execution Plan

### Phase 1: Setup & Infrastructure (Day 1 Morning)
- [ ] Create test framework structure
- [ ] Set up k6 load testing environment
- [ ] Create test utilities and helpers
- [ ] Set up test data generation
- [ ] Configure test databases (isolated)
- [ ] Set up monitoring and logging
- **Estimated Time**: 2-3 hours

### Phase 2: Edge Case Tests (Day 1-2)
- [ ] Large file upload tests (2-3 hours)
- [ ] Concurrency tests (3-4 hours)
- [ ] Rate limiting tests (2-3 hours)
- [ ] Test execution and bug fixes (2-3 hours)
- **Estimated Time**: 9-13 hours

### Phase 3: Timeout & Retry Tests (Day 2)
- [ ] Slow query timeout tests (2-3 hours)
- [ ] Network failure simulation (2-3 hours)
- [ ] Connection pool tests (2-3 hours)
- [ ] Test execution and bug fixes (1-2 hours)
- **Estimated Time**: 7-11 hours

### Phase 4: Error & Security Tests (Day 2-3)
- [ ] Error code standardization (2-3 hours)
- [ ] Error tracking ID tests (1-2 hours)
- [ ] XSS prevention tests (2-3 hours)
- [ ] CSRF protection tests (2-3 hours)
- [ ] Authentication boundary tests (2-3 hours)
- [ ] Security test fixes (1-2 hours)
- **Estimated Time**: 10-16 hours

### Phase 5: Final Validation & Documentation (Day 3)
- [ ] Run full test suite
- [ ] Create test report
- [ ] Document findings and fixes
- [ ] Final security audit
- [ ] Create deployment checklist
- **Estimated Time**: 3-4 hours

---

## 🎯 Success Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| **Test Coverage** | >95% of edge cases | Test report + coverage analysis |
| **Rate Limiting** | Enforced correctly | k6 test shows 429 when exceeded |
| **Timeout Handling** | <5s response to timeout | Load test results |
| **Error Standardization** | 100% of endpoints | Audit all error responses |
| **XSS Prevention** | Zero XSS vulnerabilities | Payload test results |
| **CSRF Protection** | All state-change ops protected | CSRF test results |
| **Auth Boundaries** | Properly enforced | Auth test results |
| **API Stability** | 99.9% uptime during tests | No unexpected crashes |
| **Security Issues** | Zero critical vulnerabilities | Security audit report |

---

## 📁 Test File Structure

```
/test
├── edge-cases/
│   ├── large-file-upload.test.ts
│   ├── concurrent-requests.test.ts
│   ├── rate-limiting.test.ts
│   └── boundary-conditions.test.ts
├── timeout-retry/
│   ├── slow-query-timeout.test.ts
│   ├── network-failure.test.ts
│   └── connection-pool.test.ts
├── error-handling/
│   ├── http-status-codes.test.ts
│   ├── error-format.test.ts
│   └── error-tracking.test.ts
├── security/
│   ├── xss-prevention.test.ts
│   ├── csrf-protection.test.ts
│   └── auth-boundaries.test.ts
├── load-tests/
│   ├── concurrency.k6.ts
│   ├── rate-limiting.k6.ts
│   └── sustained-load.k6.ts
└── utils/
    ├── test-data-generator.ts
    ├── api-client.ts
    └── assertions.ts
```

---

## 📋 Next Steps

1. **Review this plan** with team
2. **Approve scope** and success criteria
3. **Begin implementation** with Phase 1
4. **Execute tests** according to schedule
5. **Document findings** and fixes
6. **Deploy to production** after validation

---

**Document Status**: 📝 DRAFT - Ready for Review  
**Last Updated**: 2026-02-19 13:24 GMT+8  
**Next Review**: After Phase 1 completion
