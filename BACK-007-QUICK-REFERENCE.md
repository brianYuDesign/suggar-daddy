# BACK-007: Quick Reference - Test Framework & Commands

**Created**: 2026-02-19  
**Last Updated**: 2026-02-19 14:15 GMT+8

---

## 🚀 Quick Start Commands

### Setup
```bash
cd /Users/brianyu/.openclaw/workspace/recommendation-service
npm install
npm install --save-dev @nestjs/testing supertest

# Install k6 for load testing
brew install k6
```

### Start Services
```bash
cd /Users/brianyu/.openclaw/workspace
docker-compose up -d

# Verify services are running
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health  # auth-service
curl http://localhost:3002/api/health  # payment-service
curl http://localhost:3003/api/health  # content-streaming-service
curl http://localhost:3004/api/health  # subscription-service
```

---

## 📝 Run Tests

### All Tests
```bash
npm test
```

### Specific Test Files
```bash
# Edge cases (25 tests)
npm test -- edge-cases.spec.ts

# Timeout & retry (24 tests)
npm test -- timeout-retry.spec.ts

# Error & security (40 tests)
npm test -- error-security.spec.ts
```

### Specific Test Category
```bash
# Large file upload tests
npm test -- edge-cases.spec.ts -t "Large File"

# Concurrency tests
npm test -- edge-cases.spec.ts -t "Concurrent"

# Rate limiting tests
npm test -- edge-cases.spec.ts -t "Rate Limit"

# Timeout tests
npm test -- timeout-retry.spec.ts -t "Timeout"

# Retry logic tests
npm test -- timeout-retry.spec.ts -t "Network Failure"

# Circuit breaker tests
npm test -- timeout-retry.spec.ts -t "Circuit Breaker"

# Connection pool tests
npm test -- timeout-retry.spec.ts -t "Connection Pool"

# HTTP status code tests
npm test -- error-security.spec.ts -t "Status Code"

# Error format tests
npm test -- error-security.spec.ts -t "Error Format"

# XSS prevention tests
npm test -- error-security.spec.ts -t "XSS"

# CSRF protection tests
npm test -- error-security.spec.ts -t "CSRF"

# Authentication tests
npm test -- error-security.spec.ts -t "Authentication"
```

### With Coverage Report
```bash
npm test -- --coverage

# View HTML coverage report
open coverage/index.html
```

---

## 🔥 Load Tests

### Install k6
```bash
brew install k6
```

### Run Load Tests
```bash
# Basic load test (default stages: 10→50→100→100→0 VU over 17 min)
k6 run test/load/concurrent-requests.k6.ts

# Custom parameters
k6 run test/load/concurrent-requests.k6.ts \
  --vus 100 \
  --duration 5m

# With JSON output
k6 run test/load/concurrent-requests.k6.ts \
  --out json=results.json

# View results
cat results.json | jq
```

### Load Test Stages (Default)
```
Warm-up:    10 VU for 1 min    (0-10 ramp-up)
Ramp-up:   50 VU for 2 min    (10-50 ramp-up)
Load test: 100 VU for 5 min   (50-100 ramp-up)
High load: 200 VU for 5 min   (100-200 ramp-up)
Ramp-down: 100 VU for 3 min   (200-100 ramp-down)
Cool-down: 0 VU for 1 min     (100-0 ramp-down)
Total:     17 minutes
```

---

## 📊 Expected Test Results

### Edge Cases (25 tests)
```
✅ Large File Upload Tests (5)
   - Reject >1GB files
   - Accept chunked uploads
   - Handle missing chunks
   - Reject invalid content type
   - Reject zero-byte files

✅ Concurrent Request Tests (4)
   - Handle 100 concurrent GETs
   - Handle 100 concurrent POSTs
   - Detect pool exhaustion
   - Handle burst traffic

✅ Rate Limiting Tests (7)
   - Enforce per-second limit
   - Enforce per-minute limit
   - Enforce per-hour limit
   - Return 429 when exceeded
   - Include Retry-After header
   - Track X-RateLimit-* headers
   - Prevent IP spoofing

✅ Boundary Condition Tests (9)
   - Handle empty requests
   - Handle maximum fields
   - Reject negative values
   - Reject extreme values
   - Handle special characters
   - Validate min/max limits

Expected Result: 25/25 PASS ✓
```

### Timeout & Retry (24 tests)
```
✅ Slow Query Timeout Tests (5)
   - Timeout on >5s queries
   - Include timeout duration
   - Handle full table scans
   - Respect custom timeouts
   - Enforce max timeout

✅ Network Failure Retry Tests (8)
   - Retry on connection refused
   - Implement exponential backoff
   - Retry 3 times max
   - Respect 30s max timeout
   - Don't retry on 4xx errors
   - Retry on 502/503/504
   - Include Retry-After header
   - Handle partial responses

✅ Circuit Breaker Tests (5)
   - Open after 5 failures
   - Enter HALF_OPEN state
   - Close after 2 successes
   - Prevent cascades
   - Track metrics

✅ Connection Pool Tests (6)
   - Normal usage (50%)
   - Queue at high usage (95%)
   - Reject at exhaustion (100%+)
   - Detect leaks
   - Track metrics
   - Apply idle timeout

Expected Result: 24/24 PASS ✓
```

### Error & Security (40 tests)
```
✅ HTTP Status Code Tests (11)
   - 400 Bad Request
   - 401 Unauthorized
   - 403 Forbidden
   - 404 Not Found
   - 409 Conflict
   - 413 Payload Too Large
   - 415 Unsupported Media Type
   - 429 Too Many Requests
   - 500 Internal Error
   - 501 Not Implemented
   - 503 Service Unavailable

✅ Error Response Format Tests (7)
   - All required fields present
   - Error ID format correct
   - Timestamp is ISO 8601
   - Request path included
   - No sensitive data
   - Actionable details provided
   - Consistent error types

✅ Error Tracking ID Tests (3)
   - Generate unique IDs
   - Correct format
   - Allow client reference

✅ XSS Prevention Tests (5)
   - Escape <script> tags
   - Escape event handlers
   - Block javascript: URLs
   - Handle encoding bypass
   - Escape on retrieval

✅ CSRF Protection Tests (6)
   - Require token for POST/PUT/DELETE
   - Provide token on GET
   - Accept valid token
   - Reject invalid token
   - Reject expired token
   - Use different tokens

✅ Authentication Tests (8)
   - Require auth for protected
   - Accept valid Bearer token
   - Reject malformed headers
   - Prevent user data leakage
   - Support multiple auth schemes
   - Reject revoked tokens
   - Validate token signature
   - Support optional auth for public

Expected Result: 40/40 PASS ✓
```

### Load Test Results (k6)
```
Expected Metrics:
  http_req_duration:
    - p(50) < 100ms ✓
    - p(95) < 300ms ✓
    - p(99) < 500ms ✓
  
  http_req_failed: < 5% ✓
  
  rate_limited: < 20% ✓
  
  errors: < 5% ✓

Total VU: 200 (peak)
Total Requests: ~20,000+
Duration: 17 minutes
Success Rate: 95%+
```

---

## 🔍 Troubleshooting

### Tests Won't Run
```bash
# Check services are running
docker ps

# Check dependencies
npm list @nestjs/testing supertest

# Reinstall if needed
npm install
```

### Database Connection Error
```bash
# Check PostgreSQL
docker ps | grep postgres

# Restart services
docker-compose restart
```

### Rate Limiting Tests Fail
```bash
# Check Redis
docker ps | grep redis
docker exec redis redis-cli ping

# Check rate limit config
GET http://localhost:3000/api/config/rate-limits
```

### Load Test Times Out
```bash
# Try smaller load
k6 run test/load/concurrent-requests.k6.ts --vus 50 --duration 2m

# Check system resources
top
```

### Test Timeout
```bash
# Increase timeout
npm test -- --timeout 10000

# Check database performance
SELECT * FROM pg_stat_user_tables;
```

---

## 📁 File Locations

### Test Files
```
/Users/brianyu/.openclaw/workspace/recommendation-service/test/
├── integration/
│   ├── edge-cases.spec.ts          (25 tests)
│   ├── timeout-retry.spec.ts       (24 tests)
│   └── error-security.spec.ts      (40 tests)
└── load/
    └── concurrent-requests.k6.ts   (k6 load test)
```

### Documentation
```
/Users/brianyu/.openclaw/workspace/
├── BACK-007-API-EDGE-CASE-TESTING-PLAN.md
├── BACK-007-TEST-EXECUTION-GUIDE.md
├── BACK-007-COMPLETION-SUMMARY.md
└── memory/BACK-007-execution-log.md
```

### Services
```
/Users/brianyu/.openclaw/workspace/
├── recommendation-service/      (port 3000)
├── auth-service/               (port 3001)
├── payment-service/            (port 3002)
├── content-streaming-service/  (port 3003)
├── subscription-service/       (port 3004)
└── api-gateway/                (port 4000)
```

---

## 🎯 Success Criteria

### Test Execution
- [ ] All 89 tests defined and implemented
- [ ] All tests runnable without errors
- [ ] 80+ tests expected to pass
- [ ] <5% failure rate acceptable on first run

### Performance
- [ ] P50 latency < 100ms
- [ ] P95 latency < 300ms
- [ ] P99 latency < 500ms
- [ ] Error rate < 0.1%

### Security
- [ ] XSS: All 5 tests pass
- [ ] CSRF: All 6 tests pass
- [ ] Auth: All 8 tests pass
- [ ] Zero critical vulnerabilities

### Coverage
- [ ] >95% API endpoint coverage
- [ ] All edge cases tested
- [ ] All error codes tested
- [ ] All security boundaries tested

---

## 📞 Contact & Support

### Test Files Created
- Edge cases: `edge-cases.spec.ts` (25 tests)
- Timeout: `timeout-retry.spec.ts` (24 tests)
- Error/Security: `error-security.spec.ts` (40 tests)

### Documentation
- Plan: `BACK-007-API-EDGE-CASE-TESTING-PLAN.md`
- Guide: `BACK-007-TEST-EXECUTION-GUIDE.md`
- Summary: `BACK-007-COMPLETION-SUMMARY.md`
- Log: `memory/BACK-007-execution-log.md`

### Need Help?
1. Check execution guide for step-by-step instructions
2. Review test plan for detailed scenario descriptions
3. Check troubleshooting section above
4. Review test code comments for implementation details

---

**Last Updated**: 2026-02-19 14:15 GMT+8  
**Ready for Execution**: ✅ YES
