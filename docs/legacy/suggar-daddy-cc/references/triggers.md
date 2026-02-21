# Triggers - Complete Definitions

## Overview

CC Agent uses triggers to detect project changes and decide what actions to take. Each trigger is a condition + action pair.

## Backend Triggers

### trigger: backend-push
**Condition**: Git commit with `[backend]` tag or `[api]` tag
**When**: Developer pushes changes to backend services
**Action**:
1. Run `npm run test:unit`
2. Run `npm run lint` (ESLint)
3. Collect test coverage
4. Route to: `g-backend-devops`

**Example**:
```bash
git commit -m "[backend] Add payment retry logic"
git push origin main
```

**CC Response**:
- Runs all backend tests
- Fails if coverage drops >5%
- Notifies with test results + coverage delta

---

### trigger: test-failure
**Condition**: `npm run test:unit` returns exit code !== 0
**When**: Automated tests detect failures
**Action**:
1. Parse error log
2. Categorize failure (mock issue / logic / dependency)
3. Suggest fix
4. Route to: `g-backend-devops` (CRITICAL priority)

**Example**:
```
Jest: FAIL - MatchingService (Redis mock issue)
       "incr is not a function"
```

**CC Response**:
- Analyzes stack trace
- Links to known issues
- Suggests code fix with line numbers
- Notifies immediately (no batching)

---

### trigger: docker-health-fail
**Condition**: Docker container health check fails
**When**: Service becomes unhealthy
**Action**:
1. Diagnose issue (logs, resource usage)
2. Attempt recovery (restart, force-pull)
3. Notify if recovery fails
4. Route to: `g-backend-devops` (CRITICAL)

**Example**:
```
Docker: PostgreSQL master unhealthy (connection timeout)
```

**CC Response**:
- Checks logs: `docker logs suggar-daddy-postgres-master`
- Checks resources: `docker stats`
- Attempts restart: `docker-compose restart postgres-master`
- If still fails: Alerts + escalates to human

---

## Frontend Triggers

### trigger: frontend-push
**Condition**: Git commit with `[frontend]` or `[ui]` or `[admin]` tag
**When**: Developer pushes UI/frontend changes
**Action**:
1. Build Next.js (admin + frontend)
2. Run TypeScript check
3. Run E2E smoke tests
4. Measure bundle size
5. Route to: `g-frontend`

**Example**:
```bash
git commit -m "[frontend] Update dashboard layout"
git push origin main
```

**CC Response**:
- ✅ Build succeeds: Bundle size 2.3MB (+5%)
- ✅ Tests pass: 8/8 E2E smoke tests
- ✅ Notify: "Ready for review" + performance metrics

---

### trigger: admin-build-fail
**Condition**: Next.js admin build returns error
**When**: Admin frontend has compilation errors
**Action**:
1. Parse TypeScript errors
2. Suggest fixes
3. Notify frontend team
4. Route to: `g-frontend` (HIGH priority)

---

## Architecture/Documentation Triggers

### trigger: docs-push
**Condition**: Git commit with `[docs]` or modifications to `*.md` files
**When**: Documentation is updated
**Action**:
1. Validate markdown syntax
2. Check link validity
3. Ensure code examples are valid
4. Route to: `g-sa-specs`

**Example**:
```bash
git commit -m "[docs] Update API documentation"
```

---

### trigger: schema-change
**Condition**: Files in `apps/*/schema/` or `libs/*/schema/` modified
**When**: Database schema or API schema changes
**Action**:
1. Validate schema syntax
2. Check for breaking changes
3. Notify SA team + backend team
4. Route to: `g-sa-specs` (HIGH priority)

---

## Scheduled Triggers

### trigger: daily-health-check
**Condition**: Time-based (Every 6 hours)
**When**: Scheduled interval
**Action**:
1. Check all Docker containers
2. Check all PM2 services
3. Check Redis replication
4. Check PostgreSQL replication
5. Check Kafka brokers
6. Report summary
7. Route to: `g-backend-devops`

**Report Example**:
```
✅ System Health - 2026-02-19 08:00 AM
   Docker: 16/16 healthy
   PM2: 16/16 running
   Redis: 3/3 OK (replication: OK)
   PostgreSQL: Master ✅ Replica ✅
   Kafka: 1/1 OK
   API Gateway: 200ms avg response
```

---

### trigger: weekly-coverage-report
**Condition**: Time-based (Every Monday 09:00 AM)
**When**: Weekly scheduled check
**Action**:
1. Run full test suite
2. Calculate coverage
3. Compare to last week
4. Flag if coverage dropped
5. Route to: `g-backend-devops`

---

## Deployment Triggers

### trigger: deploy-tag-created
**Condition**: Git tag created with format `v*.*.*` or `release/*`
**When**: Release version is tagged
**Action**:
1. Run full test suite (unit + E2E)
2. Build Docker images
3. Perform security scan
4. Generate release notes
5. Route to: `g-sa-specs` (CRITICAL)

**Example**:
```bash
git tag -a v1.0.0 -m "Release: v1.0.0"
git push origin v1.0.0
```

---

## Error/Alert Triggers

### trigger: performance-degradation
**Condition**: API response time > 500ms (avg over 5 min)
**When**: Performance issues detected
**Action**:
1. Analyze API logs
2. Check database performance
3. Check Redis hit rate
4. Suggest optimization
5. Route to: `g-sa-specs` (HIGH priority)

---

### trigger: error-rate-spike
**Condition**: Error rate > 5% of requests
**When**: Increased error rate detected
**Action**:
1. Analyze error logs
2. Identify affected services
3. Check for recent deployments
4. Suggest rollback if needed
5. Route to: `g-backend-devops` (CRITICAL)

---

## Trigger Patterns

### Pattern: Keyword-Based
```
[backend] → Run backend tests
[frontend] → Run frontend tests
[docs] → Validate documentation
[deploy] → Trigger deployment checks
```

### Pattern: File-Path Based
```
apps/admin/* → Frontend trigger
apps/frontend/* → Frontend trigger
apps/api-gateway/* → API trigger
libs/*/* → Shared library trigger
```

### Pattern: Status-Based
```
Test failure → Analyze + notify
Docker unhealthy → Diagnose + attempt recovery
Build error → Parse + suggest fix
```

### Pattern: Time-Based
```
Every 6 hours → Health check
Every Monday 9am → Coverage report
On tag creation → Deployment checks
```

---

## Adding New Triggers

To add a custom trigger:

1. Define condition clearly
2. List all actions needed
3. Specify target channel
4. Set priority (low/medium/high/critical)
5. Add to `suggar-daddy-cc-triggers.json`

Example:
```json
{
  "name": "custom-trigger",
  "condition": "When X happens",
  "actions": ["action1", "action2"],
  "channel": "g-target-group",
  "priority": "medium"
}
```

---

_Last updated: 2026-02-19_
