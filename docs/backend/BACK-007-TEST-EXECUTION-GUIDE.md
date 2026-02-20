# BACK-007: API Final Testing & Edge Case Handling - Implementation Guide

**Project**: Sugar-Daddy Phase 1 Week 4  
**Task**: BACK-007  
**Status**: 🚀 ACTIVE - Phase 1 (Implementation)  
**Duration**: 2-3 days  
**Created**: 2026-02-19 13:24 GMT+8

---

## 📌 Quick Start

### What You're Testing

This task ensures all APIs handle:
- **Edge Cases**: Large files (>1GB), 100+ concurrent users, high-frequency calls
- **Timeouts & Retries**: Slow queries, network failures, connection pool exhaustion
- **Error Handling**: Standardized error codes, unique tracking IDs, clear messages
- **Security**: XSS prevention, CSRF protection, authentication boundaries

### Success Criteria

✅ All edge cases properly handled  
✅ Rate limiting working correctly  
✅ Timeout/retry logic implemented  
✅ Error responses standardized  
✅ Zero security vulnerabilities  

---

## 📁 Test Files Created

### Unit & Integration Tests

| File | Purpose | Test Count |
|------|---------|-----------|
| `edge-cases.spec.ts` | Large files, concurrency, rate limiting | 25+ tests |
| `timeout-retry.spec.ts` | Timeouts, retries, circuit breaker | 20+ tests |
| `error-security.spec.ts` | Error codes, XSS, CSRF, auth | 35+ tests |

### Load Tests

| File | Purpose | Scenarios |
|------|---------|-----------|
| `concurrent-requests.k6.ts` | Concurrency, rate limiting | 100-200 VU |

---

## 🚀 How to Run Tests

### 1. Install Dependencies

```bash
cd /Users/brianyu/.openclaw/workspace/recommendation-service
npm install
npm install --save-dev @nestjs/testing supertest
```

### 2. Start Services

```bash
# Start all services in docker-compose
cd /Users/brianyu/.openclaw/workspace
docker-compose up -d

# Or manually start individual services
cd recommendation-service && npm start
```

### 3. Run Integration Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- edge-cases.spec.ts
npm test -- timeout-retry.spec.ts
npm test -- error-security.spec.ts

# Run with coverage
npm test -- --coverage
```

### 4. Run Load Tests

```bash
# Install k6
brew install k6

# Run concurrent request test
k6 run test/load/concurrent-requests.k6.ts

# Run with custom parameters
k6 run test/load/concurrent-requests.k6.ts \
  --vus 100 \
  --duration 5m \
  --rps 100

# Generate JSON output for analysis
k6 run test/load/concurrent-requests.k6.ts --out json=results.json
```

---

## 📊 Test Breakdown

### Edge Cases Testing (25+ tests)

#### Large File Upload Tests
- ✅ Reject >1GB files
- ✅ Accept chunked uploads (100MB chunks)
- ✅ Handle missing chunks
- ✅ Reject invalid content types
- ✅ Reject zero-byte files

**Expected Results**:
```
PASS: All file upload edge cases handled
  - 1GB file: 413 Payload Too Large ✓
  - Chunked upload: 200 OK ✓
  - Invalid type: 415 Unsupported Media Type ✓
```

#### Concurrency Tests (100+ simultaneous)
- ✅ Handle 100 concurrent GETs
- ✅ Handle 100 concurrent POSTs
- ✅ Detect pool exhaustion
- ✅ Handle burst traffic spikes
- ✅ Maintain >95% success rate

**Expected Results**:
```
PASS: Concurrency tests
  - 100 concurrent requests: 95%+ success ✓
  - Response time P50: <100ms ✓
  - Pool exhaustion detected: ✓
```

#### Rate Limiting Tests
- ✅ Enforce per-second limit
- ✅ Return 429 when exceeded
- ✅ Include Retry-After header
- ✅ Track X-RateLimit-* headers
- ✅ Reset after window expires
- ✅ Prevent IP spoofing bypass

**Expected Results**:
```
PASS: Rate limiting
  - Per-second limit: 100 req/s ✓
  - 429 responses: When exceeded ✓
  - Retry-After: Present and valid ✓
  - Rate limit reset: After 60s ✓
```

### Timeout & Retry Testing (20+ tests)

#### Slow Query Timeouts
- ✅ Timeout on queries >5s
- ✅ Include timeout duration in error
- ✅ Handle full table scans
- ✅ Respect custom timeout parameter
- ✅ Enforce max timeout limit

**Expected Results**:
```
PASS: Timeout handling
  - Query timeout: <5s ✓
  - 408 Request Timeout: Returned ✓
  - Custom timeout: Respected ✓
```

#### Retry Logic
- ✅ Retry on connection refused
- ✅ Implement exponential backoff
- ✅ Retry exactly 3 times
- ✅ Respect max retry timeout (30s)
- ✅ Don't retry on client errors
- ✅ Include Retry-After header

**Expected Results**:
```
PASS: Retry logic
  - Exponential backoff: 100ms, 200ms, 400ms ✓
  - Max 3 retries: Enforced ✓
  - Max 30s timeout: Honored ✓
```

#### Circuit Breaker
- ✅ Open after 5 failures
- ✅ Enter HALF_OPEN state
- ✅ Close after 2 successes
- ✅ Prevent cascading failures
- ✅ Track metrics

**Expected Results**:
```
PASS: Circuit breaker
  - State transitions: Correct ✓
  - Fast fail when OPEN: ✓
  - Recovery detected: ✓
  - Metrics tracked: ✓
```

#### Connection Pool
- ✅ Normal usage (50%)
- ✅ Queue at high usage (95%)
- ✅ Reject at exhaustion (100%+)
- ✅ Detect connection leaks
- ✅ Apply idle timeout

**Expected Results**:
```
PASS: Connection pool
  - Normal usage: All succeed ✓
  - Pool exhaustion: 503 returned ✓
  - Idle cleanup: <30s ✓
```

### Error Handling & Security (35+ tests)

#### HTTP Status Codes
- ✅ 400 Bad Request
- ✅ 401 Unauthorized
- ✅ 403 Forbidden
- ✅ 404 Not Found
- ✅ 409 Conflict
- ✅ 413 Payload Too Large
- ✅ 415 Unsupported Media Type
- ✅ 429 Too Many Requests
- ✅ 500 Internal Error
- ✅ 503 Service Unavailable
- ✅ 504 Gateway Timeout

**Expected Results**:
```
PASS: HTTP status codes
  - Each error type: Correct code ✓
  - Error response: Always has body ✓
  - Client errors: Not retried ✓
```

#### Error Response Format
- ✅ All required fields present
- ✅ Error ID format (err_TIMESTAMP_HASH)
- ✅ ISO 8601 timestamp
- ✅ Request path included
- ✅ No sensitive data exposed
- ✅ Actionable details provided
- ✅ Consistent error type enum

**Expected Results**:
```
{
  "error": {
    "id": "err_1708252800000_abc123",
    "type": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "status": 400,
    "timestamp": "2026-02-19T13:24:00Z",
    "path": "/api/v1/recommendations/interactions",
    "details": { "field": "content_id", "reason": "required" }
  }
}
```

#### XSS Prevention
- ✅ Escape script tags
- ✅ Escape event handlers
- ✅ Block javascript: URLs
- ✅ Handle HTML encoding bypass
- ✅ Escape on retrieval

**Expected Results**:
```
PASS: XSS prevention
  - <script> tags: Escaped ✓
  - Event handlers: Escaped ✓
  - javascript: URLs: Blocked ✓
```

#### CSRF Protection
- ✅ Require token for POST/PUT/DELETE
- ✅ Provide token on GET
- ✅ Accept valid token
- ✅ Reject invalid token
- ✅ Reject expired token
- ✅ Use different token per session
- ✅ Exempt GET requests

**Expected Results**:
```
PASS: CSRF protection
  - POST without token: 403 ✓
  - POST with valid token: 200 ✓
  - Token validation: Works ✓
```

#### Authentication Boundaries
- ✅ Require auth for protected endpoints
- ✅ Accept valid Bearer token
- ✅ Reject malformed headers
- ✅ Prevent user data access for other users
- ✅ Support multiple auth schemes
- ✅ Reject blacklisted tokens
- ✅ Validate token signature

**Expected Results**:
```
PASS: Authentication
  - No token: 401 ✓
  - Valid token: 200/403 ✓
  - Invalid token: 401 ✓
  - Token tampering: 401 ✓
```

---

## 📋 Execution Checklist

### Phase 1: Setup (Day 1 Morning - 2-3 hours)

- [ ] Review all test files
- [ ] Install test dependencies
- [ ] Start test services
- [ ] Verify test database is isolated
- [ ] Run smoke test
- [ ] Document any setup issues

### Phase 2: Edge Case Tests (Day 1 - 4-5 hours)

- [ ] Run large file upload tests
  ```bash
  npm test -- edge-cases.spec.ts -t "Large File"
  ```
  - [ ] Verify all 5 tests pass
  - [ ] Document any failures
  - [ ] Fix failing tests

- [ ] Run concurrency tests
  ```bash
  npm test -- edge-cases.spec.ts -t "Concurrent"
  ```
  - [ ] Verify all 4 tests pass
  - [ ] Check response times
  - [ ] Document bottlenecks

- [ ] Run rate limiting tests
  ```bash
  npm test -- edge-cases.spec.ts -t "Rate Limit"
  ```
  - [ ] Verify all 6 tests pass
  - [ ] Check rate limit enforcement
  - [ ] Verify headers

### Phase 3: Timeout & Retry Tests (Day 2 - 4-5 hours)

- [ ] Run timeout tests
  ```bash
  npm test -- timeout-retry.spec.ts -t "Timeout"
  ```
  - [ ] Verify 5 tests pass
  - [ ] Check timeout handling

- [ ] Run retry logic tests
  ```bash
  npm test -- timeout-retry.spec.ts -t "Network Failure"
  ```
  - [ ] Verify 8 tests pass
  - [ ] Check exponential backoff

- [ ] Run circuit breaker tests
  ```bash
  npm test -- timeout-retry.spec.ts -t "Circuit Breaker"
  ```
  - [ ] Verify 5 tests pass
  - [ ] Check state transitions

- [ ] Run connection pool tests
  ```bash
  npm test -- timeout-retry.spec.ts -t "Connection Pool"
  ```
  - [ ] Verify 6 tests pass
  - [ ] Check pool exhaustion

### Phase 4: Error & Security Tests (Day 2-3 - 5-6 hours)

- [ ] Run HTTP status code tests
  ```bash
  npm test -- error-security.spec.ts -t "Status Code"
  ```
  - [ ] Verify all 11 tests pass
  - [ ] Check correct status codes

- [ ] Run error format tests
  ```bash
  npm test -- error-security.spec.ts -t "Error Format"
  ```
  - [ ] Verify 7 tests pass
  - [ ] Check error structure

- [ ] Run error tracking ID tests
  ```bash
  npm test -- error-security.spec.ts -t "Tracking ID"
  ```
  - [ ] Verify 3 tests pass
  - [ ] Check ID uniqueness

- [ ] Run XSS prevention tests
  ```bash
  npm test -- error-security.spec.ts -t "XSS"
  ```
  - [ ] Verify 5 tests pass
  - [ ] Check escaping

- [ ] Run CSRF protection tests
  ```bash
  npm test -- error-security.spec.ts -t "CSRF"
  ```
  - [ ] Verify 6 tests pass
  - [ ] Check token validation

- [ ] Run authentication tests
  ```bash
  npm test -- error-security.spec.ts -t "Authentication"
  ```
  - [ ] Verify 8 tests pass
  - [ ] Check boundary conditions

### Phase 5: Load Testing (Day 3 - 2-3 hours)

- [ ] Install k6
  ```bash
  brew install k6
  ```

- [ ] Run concurrent request load test
  ```bash
  k6 run test/load/concurrent-requests.k6.ts
  ```
  - [ ] Check P50 < 100ms
  - [ ] Check P95 < 300ms
  - [ ] Check error rate < 5%

- [ ] Run sustained load test (30 min)
  ```bash
  k6 run test/load/concurrent-requests.k6.ts \
    --duration 30m \
    --vus 100
  ```
  - [ ] Monitor memory usage
  - [ ] Check for memory leaks
  - [ ] Verify sustained performance

### Phase 6: Final Validation (Day 3 - 1-2 hours)

- [ ] Run full test suite
  ```bash
  npm test 2>&1 | tee test-results.log
  ```
  - [ ] Count total tests
  - [ ] Count failures
  - [ ] Review failures

- [ ] Generate test report
  ```bash
  npm test -- --coverage > coverage-report.txt
  ```
  - [ ] Check coverage >95%
  - [ ] Identify uncovered code

- [ ] Document findings
  - [ ] Create issues for failures
  - [ ] Document workarounds
  - [ ] Create fix checklist

- [ ] Security audit
  - [ ] Review XSS test results
  - [ ] Review CSRF test results
  - [ ] Review auth test results

---

## 🔍 Expected Results Summary

### Total Tests: 80+

```
Edge Cases:           25 tests ✓
Timeout & Retry:      20 tests ✓
Error & Security:     35 tests ✓
Load Testing:         (k6 scenarios)
─────────────────────────────
TOTAL:               80+ tests
```

### Success Metrics

| Metric | Target | Pass Criteria |
|--------|--------|---------------|
| Test Pass Rate | 100% | 0 failures |
| Code Coverage | >95% | No critical gaps |
| P50 Latency | <100ms | Load test shows <100ms |
| P95 Latency | <300ms | Load test shows <300ms |
| Error Rate | <0.1% | <1 per 1000 requests |
| Rate Limit | Works | 429 when exceeded |
| Security | No vulns | All XSS/CSRF/auth tests pass |

---

## 🐛 Troubleshooting

### Test Fails with "Connection Refused"

```bash
# Check services are running
docker ps | grep recommendation-service

# Start services
docker-compose up -d

# Verify service is listening
curl http://localhost:3000/api/v1/health
```

### Test Timeout Issues

```bash
# Increase test timeout
npm test -- --timeout 10000

# Check database query performance
SELECT query_time FROM slow_log WHERE query_time > 1;
```

### Rate Limiting Tests Failing

```bash
# Check rate limit configuration
GET /api/v1/config/rate-limits

# Verify Redis is running
docker exec redis redis-cli ping
```

### Load Test Errors

```bash
# Check current connections
docker exec <container> netstat -an | grep ESTABLISHED | wc -l

# Monitor resource usage
watch -n 1 'docker stats --no-stream'
```

---

## 📝 Completion Checklist

### Before Submission

- [ ] All 80+ unit/integration tests pass
- [ ] Load tests complete successfully
- [ ] Code coverage >95%
- [ ] No known security vulnerabilities
- [ ] Error handling standardized
- [ ] Rate limiting verified
- [ ] Timeout logic validated
- [ ] Retry logic working
- [ ] Documentation complete
- [ ] Team reviewed and approved

### Sign-Off

- [ ] Backend Lead: _________________
- [ ] QA Lead: _________________
- [ ] Security Reviewer: _________________
- [ ] Product Manager: _________________

---

## 📞 Next Steps

1. **Run tests** according to execution checklist
2. **Document findings** in test report
3. **Fix failures** with team
4. **Validate fixes** with re-tests
5. **Deploy** to production with confidence

---

**Document Version**: 1.0  
**Status**: 🟢 Ready to Execute  
**Last Updated**: 2026-02-19 13:24 GMT+8
