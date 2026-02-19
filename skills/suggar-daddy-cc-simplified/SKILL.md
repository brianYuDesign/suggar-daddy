---
name: suggar-daddy-cc-simplified
description: Smart collaborative agent for Sugar-Daddy. Monitors project, makes decisions automatically, notifies you only when needed. You don't see the file changes—just the results.
---

# Sugar-Daddy CC Agent (Simplified Version)

## What CC Does (For Brian)

You push code. CC automatically:
- ✅ Runs tests if it's backend code
- ✅ Builds if it's frontend code
- ✅ Validates if it's documentation
- ✅ Tells you results (bad news only unless you ask)

That's it. You don't need to know:
- Which files changed
- Which systems we touched
- How many scripts ran
- Internal logs

Just results.

---

## How It Works

### Trigger 1: Code Push
```
You push code
    ↓
CC detects what type (backend/frontend/docs/etc)
    ↓
CC runs appropriate tests/checks
    ↓
If all good: Silent (you'll know via git status)
If something broke: Message you with actionable fix
```

### Trigger 2: Something Broke
```
Test failed / Service down / Error spike
    ↓
CC analyzes what happened
    ↓
CC attempts auto-recovery if possible
    ↓
Message you: "Here's what broke, here's what I did, here's what you should do"
```

### Trigger 3: Daily Health Check (6h interval)
```
Every 6 hours (skips 22:00-08:00)
    ↓
CC checks: Docker, Services, Databases, API
    ↓
If all good: Silent
If issues: Alert with suggestions
```

---

## Telegram Notifications

### Where You'll See Messages

| Situation | Channel | Content |
|-----------|---------|---------|
| **Backend code pushed** | g-backend-devops | "✅ Tests passed" or "❌ Test failed: [fix]" |
| **Frontend code pushed** | g-frontend | "✅ Build OK" or "❌ Build failed: [fix]" |
| **System health issue** | g-backend-devops | "⚠️ Docker warning" or "🚨 Service down" |
| **Documentation changed** | g-sa-specs | "✅ Docs validated" |
| **Database schema changed** | g-sa-specs | "⚠️ Breaking change detected" |

### Message Format

**Good news:**
```
✅ Backend tests passed
  • 575/608 passing
  • 94.6% coverage
  Done in 2m 15s
```

**Bad news (with fix):**
```
❌ Test failed: UserService
  
  Error: Redis incr mock not working
  
  Suggested fix:
  → Check apps/user/src/__tests__/user.test.ts line 42
  → Mock implementation needs update
  
  Auto-recovery attempted: ❌ (needs manual fix)
```

**System issue:**
```
⚠️ API response time degraded
  • Avg: 850ms (target: <500ms)
  • Possible causes: Database slow query, Redis pressure
  
  Suggestion: Run database optimization script
  
  Auto-recovery: Restarted Redis (monitoring...)
```

---

## What You Do

### Normal Day
- Push code with tag: `[backend]`, `[frontend]`, `[docs]`
- CC handles the rest
- Check Telegram if something breaks
- Look at suggested fixes

### If Something's Wrong
- Read CC's message (it tells you the fix)
- Make the fix
- Push again
- CC validates automatically

### Zero Config
- CC figures out what to do based on what you changed
- No manual instructions needed
- No file tracking needed

---

## Safety Features

✅ **Auto-recovery for safe operations**
   - Docker restart: Yes, automatic
   - Service restart: Yes, automatic
   - Database fix: No, asks you first
   - Deployment: No, asks you first
   - Rollback: No, asks you first

✅ **Always logged**
   - Every decision CC makes is recorded
   - You can ask "what happened?" anytime
   - Full audit trail (Governance system)

✅ **Quiet hours**
   - 22:00-08:00: Only critical alerts
   - 08:00-22:00: All alerts
   - You sleep, CC watches

---

## Examples

### Example 1: Push Backend Code
```
You: git commit -m "Add user validation [backend]" && git push

CC (internal): Detected backend code
CC (internal): Runs test suite...

Result: ✅ All 150 backend tests passed
  └─ Sent to g-backend-devops
  └─ You see: "Backend tests OK"
  └─ That's it
```

### Example 2: Frontend Build Issue
```
You: git commit -m "Update dashboard UI [frontend]" && git push

CC (internal): Detected frontend code
CC (internal): Building Next.js app...
CC (internal): ❌ Build failed: TypeScript error in components

Result: ❌ Build failed
  Error: apps/web/src/components/Dashboard.tsx:42
  Type 'string' is not assignable to type 'number'
  
  Fix:
  → Line 42, change userCount from string to number
  
  Sent to g-frontend
  └─ You see exact line + error
  └─ You fix it, push again
  └─ CC auto-validates
```

### Example 3: Docker Service Down
```
(CC runs health check)

CC (internal): Docker health check failed
CC (internal): Container postgres-replica not responding
CC (internal): Attempting restart...
CC (internal): ✅ Container restarted, health OK

Result: ⚠️ Database replica had issue
  Issue: Container unhealthy (likely memory)
  Action taken: Restarted container (now healthy)
  
  Monitor: Response times should be back to normal
  If degraded persists: Check memory usage on host
  
  Sent to g-backend-devops
  └─ You know something happened
  └─ It's handled automatically
  └─ Action needed: Monitor (not urgent)
```

### Example 4: Silent Success
```
You: git commit -m "Update README" && git push

CC (internal): Detected documentation change
CC (internal): Validates markdown syntax...
CC (internal): ✅ All good

Result: Silent
  (CC doesn't notify for successful doc changes)
  (You can see in git it was merged)
```

---

## When CC Can't Auto-Fix

CC will message you when it needs your decision:

```
🚨 Error rate spike detected
  • 12% of requests failing (target: <1%)
  • Affected: Payment Service
  • Recent change: Last payment API update
  
  Possible causes:
    1. New validation too strict
    2. External payment provider issue
    3. Redis connection pool exhausted
  
  Auto-recovery attempted: ❌
  
  Your options:
    A) Rollback to previous version
    B) Hotfix the validation logic
    C) Check if payment provider is down
  
  What should I do?
```

You respond:
```
A) Rollback
```

CC:
```
✅ Rolled back to commit abc123
  • Tests running...
  • Error rate: 0.2% (good!)
  • Payment Service: Healthy
  
  When ready for proper fix:
  → Revert commit f4e2d1
  → Fix validation on line 42
  → Test locally
  → Push with [backend] tag
```

---

## Configuration (You don't need to change this)

CC automatically handles:
- ✅ Detecting what type of change you made
- ✅ Running appropriate tests
- ✅ Routing notifications to right channel
- ✅ Attempting recovery if safe
- ✅ Logging everything

You just push code.

---

## Questions?

**Q: Why doesn't CC tell me which files changed?**  
A: You already know—you just pushed them. CC tells you what it DID and what BROKE.

**Q: Can I turn off notifications?**  
A: Yes, quiet hours are 22:00-08:00 (only critical alerts).

**Q: What if CC breaks something?**  
A: Every change is logged (Governance system). You can see exactly what happened and when.

**Q: Can I tell CC to do something specific?**  
A: Not yet. Right now CC reads git tags (`[backend]`, `[frontend]`, `[docs]`). If you want custom behavior, let me know.

---

_CC Agent enabled | Simplified for Brian | 2026-02-19_
