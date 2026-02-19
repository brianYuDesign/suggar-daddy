---
name: suggar-daddy-cc
description: Smart collaborative agent for Sugar-Daddy project automation. Automatically monitors project state (git changes, test results, Docker status), decides what tasks need execution (testing, documentation, deployment), and executes workflows without requiring manual direction. Use for continuous automation, proactive monitoring, and intelligent task orchestration in development, testing, and deployment cycles.
---

# Sugar-Daddy CC (Collaborative Collaborator) Agent Skill

## What is CC?

**CC = Collaborative Collaborator** - A smart agent that:
- 🔍 **Monitors** project state changes (git, tests, Docker, logs)
- 🧠 **Decides** what tasks need to run based on triggers
- 🚀 **Executes** workflows automatically (no manual commands needed)
- 📢 **Reports** results to appropriate channels (Telegram groups)
- 📚 **Learns** from decisions to improve accuracy

## Core Workflow

```
Project Event (git push / file change / test failure)
    ↓
CC Agent Detects Trigger
    ↓
Evaluate Context (which team? what changed? risk level?)
    ↓
Decide Action (test? document? deploy? notify?)
    ↓
Execute Workflow (Claude Code / scripts / commands)
    ↓
Collect Results (logs, coverage, performance)
    ↓
Route Notification (Telegram group based on type)
    ↓
Learn & Update Decision Rules
```

## Getting Started

### 1. Enable CC Agent for Sugar-Daddy

**Prerequisites:**
- Sugar-Daddy project at `~/Project/suggar-daddy`
- OpenClaw running with gateway
- Telegram groups configured (see TOOLS.md)
- Git repository initialized

**Setup:**
```bash
# 1. Navigate to workspace
cd ~/.openclaw/workspace

# 2. Load Sugar-Daddy CC skill
openclaw skill load ./skills/suggar-daddy-cc/

# 3. Initialize CC monitoring
cron add --job '{
  "name": "suggar-daddy-cc-monitor",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { "kind": "agentTurn", "message": "Monitor sugar-daddy project and execute needed workflows" },
  "sessionTarget": "isolated",
  "enabled": true
}'

# 4. Verify setup
openclaw status
```

### 2. Configure Trigger Rules

Edit `~/.openclaw/workspace/suggar-daddy-cc-triggers.json`:

```json
{
  "triggers": [
    {
      "name": "backend-push",
      "condition": "git push to main || git commit with [backend]",
      "actions": ["test-unit", "lint", "notify-backend"],
      "channel": "g-backend-devops",
      "priority": "high"
    },
    {
      "name": "frontend-push",
      "condition": "git push to main || git commit with [frontend]",
      "actions": ["test-admin", "test-e2e", "notify-frontend"],
      "channel": "g-frontend",
      "priority": "high"
    },
    {
      "name": "test-failure",
      "condition": "npm run test:unit fails",
      "actions": ["analyze-failure", "notify-backend"],
      "channel": "g-backend-devops",
      "priority": "critical"
    },
    {
      "name": "docker-health",
      "condition": "Container health check fails",
      "actions": ["diagnose-container", "restart-service", "notify-devops"],
      "channel": "g-backend-devops",
      "priority": "critical"
    }
  ]
}
```

## Decision Logic

### When CC Agent Decides to Act

The agent uses these signals to decide autonomously:

| Signal | Action | Channel |
|--------|--------|---------|
| **git commit [backend]** | Run unit tests + lint | g-backend-devops |
| **git commit [frontend]** | Build admin/frontend + E2E tests | g-frontend |
| **git commit [docs]** | Update architecture docs | g-sa-specs |
| **Test suite fails** | Analyze failure + notify | g-backend-devops |
| **Docker health ⚠️** | Diagnose + attempt recovery | g-backend-devops |
| **PM2 service down** | Restart service + verify | g-backend-devops |
| **Deploy tag created** | Run full test suite + stage | g-sa-specs |
| **Performance degradation** | Analyze logs + report | g-sa-specs |

### When CC Agent Does NOT Act

The agent respects these boundaries:

- ❌ Never auto-deploys to production
- ❌ Never makes breaking changes
- ❌ Never skips critical tests
- ❌ Never proceeds if human review is pending
- ❌ Never acts during "quiet hours" (22:00-08:00)

## Automation Workflows

### Workflow 1: Backend Change → Automatic Testing

```
1. Detect: git commit with [backend] keyword
2. Trigger: npm run test:unit
3. Parse: Jest output (pass/fail/coverage)
4. Decide: 
   - If passed: notify success + suggest deployment
   - If failed: analyze error type + suggest fix
5. Notify: g-backend-devops with results + recommendations
6. Learn: Record commit pattern for future decisions
```

### Workflow 2: Frontend Change → Build & Test

```
1. Detect: git commit with [frontend] keyword
2. Trigger: npm run build (admin) + npm run build (frontend)
3. Verify: No TypeScript errors + bundle size OK
4. Test: npm run test:e2e (smoke tests)
5. Notify: g-frontend with build status
6. Learn: Track build time trends for performance alerts
```

### Workflow 3: Test Failure → Root Cause Analysis

```
1. Detect: npm run test:unit returns failures
2. Parse: Extract error messages + stack traces
3. Analyze:
   - Is it a known pattern?
   - Dependency issue? Mock problem? Logic bug?
4. Suggest: Provide fix recommendation
5. Notify: g-backend-devops with analysis + fix
6. Learn: Store failure pattern for faster diagnosis next time
```

### Workflow 4: Daily Health Check

```
1. Check: Docker containers health
2. Check: PM2 services running
3. Check: Redis connectivity
4. Check: PostgreSQL replication
5. Check: Kafka consumer lag
6. Report: Summary to g-backend-devops
7. Alert: If any critical issues detected
```

## Configuration Files

### Reference Files to Load as Needed

- **[TRIGGERS.md](references/triggers.md)** - Complete trigger definitions and patterns
- **[WORKFLOWS.md](references/workflows.md)** - Detailed workflow specifications
- **[DECISION_TREE.md](references/decision_tree.md)** - How CC makes autonomous decisions
- **[CHANNEL_ROUTING.md](references/channel_routing.md)** - Which group gets notified for which events

### Scripts to Execute

- **[scripts/monitor.js](scripts/monitor.js)** - Main monitoring loop
- **[scripts/trigger-detector.js](scripts/trigger-detector.js)** - Detects git/file/status changes
- **[scripts/workflow-executor.js](scripts/workflow-executor.js)** - Executes action workflows
- **[scripts/notification-router.js](scripts/notification-router.js)** - Routes results to channels

## Usage Examples

### Example 1: Backend Developer Push

```
Developer: git commit -m "[backend] Add payment validation"
           git push origin main

CC Agent:
1. Detects commit with [backend] tag
2. Runs: npm run test:unit
3. Gets: ✅ 575/608 tests passed (94.6%)
4. Notifies g-backend-devops:
   "✅ Payment validation merged
    🧪 Tests: 575/608 (94.6%)
    📊 Coverage: +2.3%
    ✅ Ready for next build"
```

### Example 2: Frontend Developer Push

```
Developer: git commit -m "[frontend] Update admin dashboard"
           git push origin main

CC Agent:
1. Detects commit with [frontend] tag
2. Runs: npm run build (both apps)
3. Runs: npm run test:e2e
4. Notifies g-frontend:
   "✅ Admin dashboard updated
    📦 Build: 2.3MB → 2.4MB
    🧪 E2E: All smoke tests passed
    ✅ Ready for deploy"
```

### Example 3: Automatic Test Failure Detection

```
CI Pipeline: npm run test:unit failures detected

CC Agent:
1. Analyzes error: "Redis incr not a function"
2. Recognizes pattern: Known mock issue
3. Suggests fix: Check mock setup in MatchingService
4. Notifies g-backend-devops:
   "⚠️ Test failure in matching.service.spec.ts
    🔧 Issue: Redis mock incomplete
    💡 Suggestion: Add incr() to mock definition
    📝 Docs: See [TESTING.md#redis-mocks]"
```

### Example 4: Daily Health Check

```
CC Agent (Every 6 hours):

1. Docker health: ✅ 16/16 containers healthy
2. PM2 services: ✅ 16 services running
3. Redis: ✅ 3 instances OK (replication OK)
4. PostgreSQL: ✅ Master/Replica healthy
5. Kafka: ✅ All brokers healthy
6. API Gateway: ✅ Responding 200ms avg

Notifies g-backend-devops:
"✅ System Health - All Green
 🐳 Docker: 16/16 ✅
 🔧 PM2: 16/16 ✅
 🔴 Redis: 3/3 ✅
 🗄️ PostgreSQL: 2/2 ✅
 📨 Kafka: 1/1 ✅
 🚀 API: 200ms avg ✅"
```

## Learning & Optimization

### CC Agent Improves Over Time

The agent stores decision history in `~/.openclaw/workspace/suggar-daddy-cc-decisions.json`:

```json
{
  "decisions": [
    {
      "timestamp": "2026-02-19T08:30:00Z",
      "trigger": "[backend] payment",
      "decision": "run-unit-tests",
      "result": "pass",
      "confidence": 0.95,
      "feedback": "correct"
    }
  ],
  "patterns": {
    "backend-changes": { "success_rate": 0.97, "avg_time": 180 },
    "frontend-changes": { "success_rate": 0.95, "avg_time": 240 }
  }
}
```

Over time, CC agent:
- ✅ Recognizes patterns faster
- ✅ Makes better predictions
- ✅ Reduces false positives
- ✅ Optimizes execution order

## Safety Guards

### CC Agent Respects Boundaries

1. **Human Override**: If Brian sends `cc pause`, agent stops all actions
2. **Critical Operations**: Always requires review before production deploys
3. **Destructive Operations**: Always asks for confirmation (e.g., database migrations)
4. **Unknown Patterns**: Falls back to human review if confidence < 70%
5. **Quiet Hours**: Respects 22:00-08:00 window (no non-critical actions)

### Monitoring CC Agent

To keep tabs on what CC is doing:

```bash
# View recent decisions
tail -50 ~/.openclaw/workspace/suggar-daddy-cc-decisions.json | jq

# View success rate
jq '.patterns | map(.success_rate)' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json

# Pause CC agent
cron update --jobId <job-id> --patch '{"enabled": false}'

# Resume CC agent
cron update --jobId <job-id> --patch '{"enabled": true}'
```

## Next Steps for Brian

1. **Review this skill** - Understand the workflow and decision logic
2. **Configure triggers** - Edit `suggar-daddy-cc-triggers.json` with your patterns
3. **Set up monitoring** - Enable the cron job to start CC agent
4. **Verify notifications** - Confirm results are routing to correct Telegram groups
5. **Monitor learning** - Watch decision history over first week
6. **Iterate** - Adjust triggers based on real usage patterns

## Get Help

For detailed information, see:
- [TRIGGERS.md](references/triggers.md) - All available triggers
- [WORKFLOWS.md](references/workflows.md) - Workflow specifications
- [DECISION_TREE.md](references/decision_tree.md) - Decision logic
- [CHANNEL_ROUTING.md](references/channel_routing.md) - Channel mappings
- [FAQ.md](references/faq.md) - Common questions

---

**Created**: 2026-02-19
**For**: Sugar-Daddy Project
**Status**: Ready for deployment
