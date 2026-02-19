# Channel Routing - Which Group Gets Notified

## Overview

CC Agent routes notifications to different Telegram groups based on:
- **Event type** (backend/frontend/infrastructure)
- **Priority** (normal/high/critical)
- **Team responsible** (who should be aware?)

## Group Mapping

| Group | Chat ID | Purpose | Receives |
|-------|---------|---------|----------|
| **g-backend-devops** | -5298003529 | Backend & DevOps tasks | Backend changes, tests, deployments, infrastructure alerts |
| **g-frontend** | -5255123740 | Frontend tasks | Frontend changes, builds, E2E results |
| **g-sa-specs** | -5112586079 | System Architecture | Architecture changes, deployments, performance alerts |
| **g-ai-news** | -5222197646 | AI-related tasks | AI/ML tasks (if applicable) |
| **g-crypto-news** | -5224275409 | Blockchain tasks | Web3 tasks (if applicable) |
| **g-general** | -5163850548 | General/unclassified | Catch-all for items not matching specific groups |

## Routing Rules

### Backend Events → g-backend-devops

**Git Commit Pattern**: `[backend]`, `[api]`, `[service]`

```json
{
  "trigger": "backend-push",
  "channel": "g-backend-devops",
  "events": [
    "Unit test results",
    "Coverage reports",
    "Lint errors",
    "API changes",
    "Dependency updates",
    "Test failures (with analysis)",
    "Performance degradation",
    "Error rate spike",
    "Service health alerts"
  ],
  "notify": "immediate"
}
```

**Example Messages**:
```
✅ Backend Tests Passed
   575/608 (94.6%) ✅
   Commit: [backend] Add payment retry

⚠️ Test Failure
   MatchingService (Redis mock issue)
   Suggested fix: Add incr to mock
```

### Frontend Events → g-frontend

**Git Commit Pattern**: `[frontend]`, `[ui]`, `[admin]`

```json
{
  "trigger": "frontend-push",
  "channel": "g-frontend",
  "events": [
    "Build status (success/failure)",
    "Bundle size changes",
    "E2E test results",
    "TypeScript errors",
    "Performance metrics",
    "CSS/styling changes"
  ],
  "notify": "immediate"
}
```

**Example Messages**:
```
✅ Frontend Build Complete
   Admin: 2.4MB (+5%)
   Frontend: 1.8MB (→)
   E2E Tests: 8/8 ✅
```

### Architecture/Deploy Events → g-sa-specs

**Git Commit Pattern**: `[docs]`, `[deploy]`, `[arch]`

```json
{
  "trigger": "arch-change",
  "channel": "g-sa-specs",
  "events": [
    "Schema changes",
    "API contract changes",
    "Architecture documentation updates",
    "Release validation",
    "Deployment readiness",
    "Performance benchmarks",
    "Capacity planning alerts"
  ],
  "notify": "immediate"
}
```

**Example Messages**:
```
📋 Release Validation (v1.0.0)
   Tests: 575/608 ✅
   Security: ✅ No vulnerabilities
   Docker: 8 images built ✅
   Status: Ready for deploy
```

### Infrastructure/Health Events → g-backend-devops

**Trigger**: Scheduled health checks, Docker alerts

```json
{
  "trigger": "system-health",
  "channel": "g-backend-devops",
  "frequency": "Every 6 hours",
  "events": [
    "Docker container health",
    "PM2 service status",
    "Database replication status",
    "Redis cluster health",
    "Kafka broker status",
    "API gateway health",
    "System resource usage"
  ],
  "notify": "batched (every 6h) or immediate (if critical)"
}
```

**Example Messages**:
```
✅ System Health - 6-hour check
   Docker: 16/16 ✅
   PM2: 16/16 ✅
   PostgreSQL: Master ✅ Replica ✅
   Redis: 3/3 ✅
   Kafka: 1/1 ✅
```

### Critical Alerts → g-backend-devops

**Priority**: CRITICAL (immediate, no batching)

```json
{
  "events": [
    "Service down",
    "Database unavailable",
    "Test failure with high impact",
    "Deployment validation failed",
    "Security vulnerability detected",
    "Container restart loop detected"
  ],
  "channel": "g-backend-devops",
  "notify": "IMMEDIATE",
  "escalation": "If not acknowledged in 5 min, notify again"
}
```

**Example Messages**:
```
🚨 CRITICAL: PostgreSQL Replica Down
   Status: Unhealthy (connection timeout)
   Last seen: 2 min ago
   Diagnosis: High memory usage detected
   Attempted recovery: Restart failed
   Action: Manual intervention required
```

## Multi-Group Notifications

Some events notify multiple groups:

### Event: Database Schema Change

```
Primary: g-sa-specs (architects need to know)
Secondary: g-backend-devops (engineers need to know)

Message to g-sa-specs:
  "📋 Schema change detected
   Files: apps/database/migrations/...
   Changes: [list of changes]"

Message to g-backend-devops:
  "⚠️ Database migration pending
   Review: See schema change in g-sa-specs
   Action: Coordinate with team"
```

### Event: Performance Degradation

```
Primary: g-sa-specs (performance concern)
Secondary: g-backend-devops (investigation needed)

Message to g-sa-specs:
  "📊 Performance Alert
   API response: 500ms (normal: 200ms)
   Affected endpoints: [...]"

Message to g-backend-devops:
  "🔍 Performance investigation
   See alert in g-sa-specs
   Action: Check logs + database queries"
```

### Event: Release Deployment

```
Primary: g-sa-specs (deployment readiness)
Secondary: g-backend-devops (implementation check)
Secondary: g-frontend (UI testing needed)

Message distribution:
  g-sa-specs: Full validation report
  g-backend-devops: Backend test results
  g-frontend: Frontend test results
```

## Message Format Guidelines

### Success Message
```
✅ [Operation] [Status]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Key metrics]

💡 [Additional info or next steps]
```

### Warning Message
```
⚠️ [Operation] [Status]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Issue description]

🔧 [Recommended action]
```

### Critical Alert
```
🚨 CRITICAL: [Issue]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Situation]
[Impact]
[Diagnosis]
[Recovery attempt status]

👉 [Action required]
```

## Notification Batching

### When to Batch
- Multiple events of same type within 5 minutes
- Non-critical issues
- Health checks (batch into one report)

### When NOT to Batch
- Test failures (notify immediately)
- Critical alerts (notify immediately)
- Deployment events (notify immediately)
- Performance degradation (notify immediately)

## Quiet Hours

### Default Quiet Hours: 22:00 - 08:00

```
During quiet hours:

✅ ALWAYS notify (immediate):
   • CRITICAL alerts (service down, etc)
   • Deployment validations
   • Security alerts

⏳ DEFER to next interval:
   • Non-critical tests
   • Health checks
   • Performance reports

🔕 SILENT notifications:
   • No notifications
   • Log to file for review next morning
```

### Override Quiet Hours

Brian can override with commands:
```
"cc urgent" - Force immediate notification
"cc quiet" - Enable quiet mode
"cc normal" - Disable quiet mode
```

## Customization

To add new groups or modify routing:

1. Add group mapping to this file
2. Define trigger patterns
3. Test with sample events
4. Update CC Agent triggers.json

Example:
```json
{
  "group_id": "g-new-group",
  "chat_id": -5000000000,
  "purpose": "New team",
  "triggers": ["trigger-1", "trigger-2"]
}
```

---

_Last updated: 2026-02-19_
