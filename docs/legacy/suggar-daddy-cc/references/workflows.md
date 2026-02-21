# Workflows - Detailed Specifications

## Overview

Workflows are step-by-step procedures that CC Agent executes when triggered. Each workflow is atomic, idempotent, and can be interrupted safely.

## Workflow 1: Backend Unit Testing

**Trigger**: Git push with `[backend]` tag
**Duration**: ~3-5 minutes
**Channel**: g-backend-devops
**Blocks**: Further actions until completion

### Steps

```
1. PRE-CHECK
   ├─ Verify git repository status
   ├─ Verify Docker containers healthy
   ├─ Verify npm dependencies installed
   └─ Setup: NODE_ENV=test

2. RUN TESTS
   ├─ Command: npm run test:unit
   ├─ Capture: stdout, stderr, exit code
   ├─ Parse: Jest JSON output
   └─ Extract: test count, coverage %, failures

3. ANALYZE RESULTS
   ├─ If all pass: ✅
   ├─ If some fail:
   │  ├─ Categorize failures (mock/logic/dependency)
   │  ├─ Extract error messages
   │  └─ Look up known fixes
   └─ If critical failure: 🚨 (abort further checks)

4. COLLECT METRICS
   ├─ Calculate coverage %
   ├─ Compare to baseline
   ├─ Flag if coverage dropped >5%
   └─ Extract performance metrics

5. NOTIFY
   ├─ Build report (pass/fail/coverage/time)
   ├─ Include recommendations
   └─ Post to g-backend-devops

6. STORE RESULTS
   ├─ Append to decision history
   ├─ Update metrics baseline
   └─ Learn patterns for next time
```

### Example Output

```
✅ Backend Tests Passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Suites:  45 passed, 48 total
Tests:        575 passed, 608 total
Coverage:     94.6% (⬆️ +2.3% from last run)
Time:         3m 42s

📊 Details:
  • auth.service.spec.ts ✅
  • payment.service.spec.ts ✅
  • subscription.service.spec.ts ✅
  • ... (42 more passed)

⚠️ Failed:
  • fcm.service.spec.ts ❌ (5 tests)
    Issue: CircuitBreakerService not mocked
    Fix: Add to test module providers
    
  • matching.service.spec.ts ❌ (2 tests)
    Issue: Redis mock missing incr()
    Fix: Add incr: jest.fn() to mock

💡 Recommendation:
  ✅ Ready for merge (94.6% pass rate)
  ⚠️ Fix remaining tests before production
```

---

## Workflow 2: Frontend Build & Test

**Trigger**: Git push with `[frontend]` tag
**Duration**: ~4-6 minutes
**Channel**: g-frontend
**Blocks**: Further deployment until completion

### Steps

```
1. PRE-CHECK
   ├─ Verify Docker infrastructure
   ├─ Verify Next.js dependencies
   └─ Setup: NODE_ENV=development

2. BUILD ADMIN
   ├─ Command: npm run build (apps/admin)
   ├─ Verify: No TypeScript errors
   ├─ Measure: Bundle size (baseline: ~2.3MB)
   └─ Flag: If bundle size +20% (potential issue)

3. BUILD FRONTEND
   ├─ Command: npm run build (apps/frontend)
   ├─ Verify: No TypeScript errors
   ├─ Measure: Bundle size
   └─ Check: All routes compile

4. RUN E2E SMOKE TESTS
   ├─ Start: Local dev server
   ├─ Run: Playwright smoke tests
   ├─ Check: Login, dashboard, main features
   ├─ Verify: API integration working
   └─ Verify: No 404 or 500 errors

5. PERFORMANCE CHECK
   ├─ Measure: Build time (flag if +30% slower)
   ├─ Measure: Bundle size deltas
   ├─ Extract: Code split stats
   └─ Flag: Any regression

6. NOTIFY
   ├─ Build report (build status, bundle size, E2E results)
   ├─ Include: Performance metrics
   └─ Post to g-frontend

7. STORE RESULTS
   ├─ Store bundle size baseline
   ├─ Store build time
   └─ Track trends
```

### Example Output

```
✅ Frontend Build & Tests Passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Build Status:  ✅ Admin + ✅ Frontend
Bundle Size:   Admin 2.4MB (↑5%), Frontend 1.8MB (→ no change)
E2E Tests:     8/8 passed ✅
Build Time:    4m 23s (↓12% faster than last)

📊 Details:
  ✅ Login flow working
  ✅ Dashboard rendering
  ✅ API integration OK
  ✅ No console errors
  ✅ Performance score: 92

💡 Status:
  ✅ Ready for review & merge
  📈 Performance: Better than last build
```

---

## Workflow 3: Test Failure Analysis

**Trigger**: npm run test:unit fails
**Duration**: ~1-2 minutes
**Channel**: g-backend-devops (CRITICAL)
**Blocks**: All further actions

### Steps

```
1. CAPTURE ERROR
   ├─ Extract: Error message
   ├─ Extract: Stack trace
   ├─ Extract: Failed service name
   └─ Extract: Test file path

2. CATEGORIZE FAILURE
   ├─ Check: Is it a known pattern?
   │  ├─ Mock incomplete? (Redis, DB)
   │  ├─ Dependency issue? (Module not found)
   │  ├─ Type error? (TypeScript)
   │  └─ Logic error? (Test assertion)
   ├─ Score confidence: 0-100%
   └─ Suggest: Category & fix

3. SEARCH SOLUTIONS
   ├─ Check: Known issues database
   ├─ Check: Git history for similar errors
   ├─ Extract: Previous fixes
   └─ Confidence: Match score

4. GENERATE FIX SUGGESTION
   ├─ If high confidence (>80%):
   │  ├─ Provide exact code fix
   │  ├─ Include: File path + line numbers
   │  └─ Include: Reasoning
   ├─ If medium confidence (50-80%):
   │  ├─ Provide analysis + options
   │  └─ Ask: Which option looks right?
   └─ If low confidence (<50%):
      └─ Escalate: Ask for human review

5. NOTIFY
   ├─ CRITICAL alert (immediate, no batching)
   ├─ Include: Error analysis
   ├─ Include: Suggested fix
   ├─ Include: Link to full error log
   └─ Post to g-backend-devops

6. STORE PATTERN
   ├─ Store: Error pattern + fix
   ├─ Record: Confidence score
   ├─ Mark: For future pattern matching
   └─ Learn: Faster diagnosis next time
```

### Example Output

```
🚨 CRITICAL: Test Suite Failure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Service: matching.service.spec.ts
Tests Failed: 2/608 (99.7% still passing)

Error:
  TypeError: this.redis.incr is not a function
  at MatchingService.recordSwipe (matching.service.ts:127)

Analysis:
  Known Issue: Redis mock incomplete
  Confidence: 95% (seen 7 times before)
  
Fix Suggestion:
  File: apps/matching/src/__tests__/matching.service.spec.ts
  Line: 45
  
  Add to redis mock:
    incr: jest.fn().mockResolvedValue(1)
  
  Reference: See #245, #178 (similar fixes)

⏱️ Estimated fix time: 5 minutes

👉 Next step: Apply fix and re-run tests
```

---

## Workflow 4: Daily Health Check

**Trigger**: Time-based (Every 6 hours)
**Duration**: ~2-3 minutes
**Channel**: g-backend-devops
**Priority**: Normal (can batch with other checks)

### Steps

```
1. CHECK DOCKER CONTAINERS
   ├─ Command: docker ps -a
   ├─ Verify: 16/16 containers running
   ├─ Check: Health status of each
   ├─ Flag: If any unhealthy
   └─ Extract: Uptime, resource usage

2. CHECK PM2 SERVICES
   ├─ Command: pm2 list
   ├─ Verify: 16/16 services running
   ├─ Check: CPU/Memory usage
   ├─ Flag: If any crashed
   └─ Auto-restart: If needed

3. CHECK DATA STORES
   ├─ Redis:
   │  ├─ Command: redis-cli ping
   │  ├─ Check: All 3 instances responding
   │  ├─ Verify: Replication working
   │  └─ Extract: Memory usage
   ├─ PostgreSQL:
   │  ├─ Command: psql -c "SELECT version()"
   │  ├─ Check: Master + Replica healthy
   │  ├─ Verify: Replication lag <100ms
   │  └─ Extract: DB size, connections
   └─ Kafka:
      ├─ Command: docker exec kafka kafka-broker-api-versions.sh
      ├─ Check: Broker responsive
      ├─ Verify: All topics OK
      └─ Extract: Consumer lag

4. CHECK API GATEWAY
   ├─ Command: curl -s http://localhost:3000/health
   ├─ Verify: Response 200 OK
   ├─ Measure: Response time (baseline: <200ms)
   ├─ Flag: If >500ms
   └─ Extract: Service version

5. AGGREGATE RESULTS
   ├─ Consolidate: All checks
   ├─ Determine: Overall health (🟢 green / 🟡 yellow / 🔴 red)
   ├─ Highlight: Any issues
   └─ Calculate: System uptime

6. NOTIFY
   ├─ If 🟢 (all green):
   │  └─ Quick summary to g-backend-devops
   ├─ If 🟡 (warnings):
   │  ├─ Alert + recommendations
   │  └─ Post to g-backend-devops
   └─ If 🔴 (critical):
      ├─ CRITICAL alert
      ├─ Immediate notification
      └─ Escalate if auto-recovery fails

7. STORE METRICS
   ├─ Record: Timestamp, all metrics
   ├─ Track: Trends (uptime, performance)
   └─ Flag: Any degradation patterns
```

### Example Output

```
✅ System Health - 2026-02-19 08:00 AM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐳 Docker Containers: 16/16 ✅
   ├─ postgres-master: healthy (uptime: 12d)
   ├─ postgres-replica: healthy (uptime: 12d)
   ├─ redis-master: healthy (uptime: 12d)
   ├─ redis-replica-1: healthy (uptime: 12d)
   ├─ redis-replica-2: healthy (uptime: 12d)
   ├─ kafka: healthy (uptime: 12d)
   ├─ zookeeper: healthy (uptime: 12d)
   └─ 9 microservices: all healthy

🔧 PM2 Services: 16/16 ✅
   └─ All running, total uptime: 8d 14h

💾 Data Stores:
   ├─ PostgreSQL: Master ✅ Replica ✅
   │  └─ Replication lag: 2ms (OK)
   ├─ Redis: 3/3 instances ✅
   │  └─ Replication: OK
   └─ Kafka: 1/1 broker ✅
      └─ Topics: 8/8 healthy

🚀 API Gateway: ✅
   └─ Response time: 142ms (↓8% faster than avg)

📊 Summary:
   • Overall: 🟢 GREEN (all healthy)
   • Uptime: 99.97%
   • Last alert: 6 hours ago (resolved)
   • No action needed

🎯 Next check: 2026-02-19 14:00 (in 6 hours)
```

---

## Workflow 5: Deploy Validation

**Trigger**: Git tag created (v*.*.* or release/*)
**Duration**: ~8-12 minutes
**Channel**: g-sa-specs
**Blocks**: Deployment until completion

### Steps

```
1. VERIFY RELEASE TAG
   ├─ Extract: Version number
   ├─ Verify: Format is valid (semantic versioning)
   ├─ Verify: Tag exists in git
   └─ Extract: Release notes (if any)

2. CHECKOUT & BUILD
   ├─ Checkout: Tag commit
   ├─ Build: All services (npm run build)
   ├─ Verify: No TypeScript errors
   └─ Verify: All dependencies resolved

3. RUN FULL TEST SUITE
   ├─ Run: npm run test:unit (all)
   ├─ Run: npm run test:e2e (all)
   ├─ Verify: 100% pass rate (or acknowledge failures)
   ├─ Verify: Coverage >90%
   └─ Extract: Test reports

4. SECURITY CHECK
   ├─ Run: npm audit (check for vulnerabilities)
   ├─ Run: SonarQube scan (if configured)
   ├─ Flag: Any HIGH or CRITICAL issues
   └─ Require: Security review if issues found

5. BUILD DOCKER IMAGES
   ├─ Build: All service images with tag
   ├─ Tag: With version + latest
   ├─ Verify: All images built successfully
   └─ Extract: Image digests, sizes

6. GENERATE RELEASE NOTES
   ├─ Extract: Commits since last release
   ├─ Group: By type (feat/fix/breaking)
   ├─ Include: Issue references
   └─ Create: Human-readable changelog

7. NOTIFY
   ├─ Post: Release validation report
   ├─ Include: Test results, coverage, security check
   ├─ Include: Generated release notes
   ├─ Include: Docker image info
   ├─ Status: ✅ Ready for deploy or 🚫 Blocked
   └─ Post to g-sa-specs

8. AWAIT DECISION
   ├─ If ✅ Ready: Awaits manual approval for production deploy
   ├─ If 🚫 Blocked: List required fixes
   └─ Store: Release metadata for deploy
```

---

## Error Handling

All workflows have built-in error handling:

```
On any step failure:
1. Capture: Error details
2. Log: Full error context
3. Decide: Retry or escalate?
   ├─ Transient error? → Retry (max 3 times)
   ├─ Permanent error? → Escalate to human
   └─ Unknown? → Ask for manual intervention
4. Notify: Error to appropriate channel
5. Document: For learning
```

---

_Last updated: 2026-02-19_
