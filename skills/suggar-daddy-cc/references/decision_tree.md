# Decision Tree - How CC Agent Decides What To Do

## Overview

The CC Agent uses a decision tree to determine what action to take when a trigger is detected. This document shows the complete logic flow.

## Main Decision Flow

```
Event Detected
    ↓
[1] What type of event?
    ├─ Git push detected
    ├─ Time-based trigger
    ├─ Docker health alert
    ├─ Test failure alert
    └─ Performance alert
    ↓
[2] Match to trigger pattern
    ├─ Backend commit? → backend-push trigger
    ├─ Frontend commit? → frontend-push trigger
    ├─ Health check time? → daily-health-check trigger
    ├─ Service unhealthy? → docker-health-fail trigger
    └─ Tests failed? → test-failure trigger
    ↓
[3] Check safety constraints
    ├─ Quiet hours (22:00-08:00)? → DEFER or SKIP
    ├─ Human review pending? → SKIP
    ├─ Destructive operation? → ASK FIRST
    └─ Production deploy? → REQUIRE REVIEW
    ↓
[4] Is confidence high enough (>70%)?
    ├─ YES → Execute workflow
    ├─ NO → Ask for human guidance
    └─ MAYBE → Execute cautiously + monitor closely
    ↓
[5] Execute workflow + notify
```

## Detailed Decision Trees by Trigger Type

### Git Push Detection

```
Git push detected
    ↓
[1] Extract commit message
    ├─ Contains [backend]? → YES
    ├─ Contains [frontend]? → YES
    ├─ Contains [docs]? → YES
    ├─ Contains [deploy]? → YES
    ├─ Contains [ci]? → YES
    └─ No recognized tag? → Notify dev to use tags
    ↓
[2] If backend tag:
    ├─ Check safety:
    │  ├─ Changes are in apps/api-gateway, apps/*/service, or libs/?
    │  │  └─ YES → PROCEED
    │  └─ Changes outside safe zones?
    │     └─ NO → WARN but proceed
    ├─ Confidence level:
    │  └─ High (100%) → Run tests immediately
    └─ Action:
       └─ Start: backend unit test workflow
    ↓
[3] If frontend tag:
    ├─ Check safety:
    │  ├─ Changes are in apps/admin, apps/frontend?
    │  │  └─ YES → PROCEED
    │  └─ Changes elsewhere?
    │     └─ WARN
    ├─ Confidence level:
    │  └─ High (100%) → Run build & tests
    └─ Action:
       └─ Start: frontend build workflow
    ↓
[4] If docs tag:
    ├─ Changes are *.md files?
    │  ├─ YES → Validate markdown
    │  └─ NO → Ask: Are you sure this is docs?
    └─ Action:
       └─ Start: docs validation workflow
    ↓
[5] Notify channel:
    ├─ Backend → g-backend-devops
    ├─ Frontend → g-frontend
    ├─ Docs → g-sa-specs
    └─ Deploy → g-sa-specs
```

### Health Check Time-Based Trigger

```
6-hour interval elapsed
    ↓
[1] Check if quiet hours (22:00-08:00)
    ├─ YES → DEFER to next interval
    └─ NO → PROCEED
    ↓
[2] Check if critical alerts pending
    ├─ YES → Prioritize those first
    └─ NO → Continue health check
    ↓
[3] Confidence level:
    ├─ Always high (100%) for health checks
    └─ Execute immediately
    ↓
[4] Start: daily-health-check workflow
    ├─ Check Docker (5 sec)
    ├─ Check PM2 (3 sec)
    ├─ Check data stores (10 sec)
    ├─ Check API gateway (2 sec)
    └─ Compile report (2 sec)
    ↓
[5] Determine health status:
    ├─ All green? → Brief summary to g-backend-devops
    ├─ Yellow warning? → Detailed alert + recommendations
    └─ Red critical? → IMMEDIATE alert + escalate
```

### Test Failure Detection

```
npm run test:unit exits with non-zero code
    ↓
[1] Parse error output
    ├─ Extract: Which tests failed?
    ├─ Extract: Error messages
    ├─ Extract: Stack traces
    └─ Extract: Service name
    ↓
[2] Categorize failure:
    ├─ "X is not a function"?
    │  └─ Likely mock issue → Category: MOCK_ERROR
    ├─ "Cannot find module X"?
    │  └─ Likely dependency → Category: DEPENDENCY_ERROR
    ├─ "expected X to equal Y"?
    │  └─ Likely logic → Category: LOGIC_ERROR
    ├─ "SyntaxError"?
    │  └─ Likely TypeScript → Category: SYNTAX_ERROR
    └─ Unknown?
       └─ Category: UNKNOWN_ERROR
    ↓
[3] Lookup known patterns:
    ├─ Is this error in our database?
    │  ├─ YES → Get previous fix (confidence +30%)
    │  └─ NO → Continue analysis
    ├─ Check git history:
    │  ├─ Has this failed before? (confidence +20%)
    │  └─ What was the fix? (reuse if applicable)
    └─ Confidence score: Calculate total
    ↓
[4] Generate fix suggestion:
    ├─ If confidence >80%:
    │  ├─ Generate specific fix
    │  ├─ Include: File + line number
    │  ├─ Include: Code snippet
    │  └─ Confidence: "95% sure"
    ├─ If confidence 50-80%:
    │  ├─ Show analysis + options
    │  └─ Confidence: "60% sure"
    └─ If confidence <50%:
       ├─ Escalate to human
       └─ Provide: Error details + context
    ↓
[5] Notify (CRITICAL priority):
    ├─ Include: Error analysis
    ├─ Include: Suggested fix (if >70% confidence)
    ├─ Include: Link to error log
    ├─ Include: Services affected
    └─ Post to: g-backend-devops (immediate, no batching)
    ↓
[6] Store decision:
    ├─ Record: Error pattern + fix
    ├─ Record: Confidence score
    ├─ Record: Whether fix was applied + result
    └─ Learn: For next similar error
```

### Docker Health Alert

```
Docker health check fails
    ↓
[1] Identify affected container
    ├─ Extract: Container name
    ├─ Extract: Health status
    └─ Extract: Error message
    ↓
[2] Determine criticality:
    ├─ Is it a core service?
    │  ├─ PostgreSQL, Redis, Kafka? → CRITICAL
    │  ├─ Microservice? → HIGH
    │  └─ Optional service? → MEDIUM
    ↓
[3] Attempt diagnosis:
    ├─ Check: docker logs <container>
    ├─ Check: docker stats <container> (CPU/memory)
    ├─ Check: Network connectivity (ping other containers)
    ├─ Check: Disk space
    └─ Compile: Diagnosis report
    ↓
[4] Decide: Attempt recovery?
    ├─ If CRITICAL & simple fix possible:
    │  ├─ Attempt: docker restart <container>
    │  ├─ Wait: 10 seconds
    │  ├─ Check: Is it healthy now?
    │  └─ If YES → Log recovery + continue
    ├─ If CRITICAL & recovery failed:
    │  └─ ESCALATE: Alert human immediately
    └─ If not CRITICAL:
       └─ Log issue, alert, let human decide
    ↓
[5] Notify:
    ├─ Include: Container name + status
    ├─ Include: Diagnosis
    ├─ Include: Recovery attempt (if any)
    ├─ Include: Next steps
    └─ Post to: g-backend-devops (CRITICAL priority)
```

## Confidence Scoring

CC Agent calculates confidence for each decision:

```
Base confidence: 0%

+20: Exact match in trigger patterns
+15: Similar past event with successful resolution
+15: High-confidence error categorization
+20: Automatic recovery previously worked for this issue
+10: Multiple signals pointing to same root cause
-10: New pattern (never seen before)
-15: Conflicting signals
-20: Multiple dependencies unclear

Result confidence = sum(all signals)

Decision:
├─ >85%: Execute immediately
├─ 70-85%: Execute with increased monitoring
├─ 50-69%: Ask for confirmation
└─ <50%: Escalate to human
```

## Safety Constraints

Before any action, CC Agent checks:

### 1. Quiet Hours (22:00 - 08:00)
```
If quiet hours:
├─ CRITICAL alerts? → Execute immediately
├─ High priority? → Execute with notification
└─ Normal? → DEFER to next interval
```

### 2. Production Environment
```
If production operation:
├─ Deploy? → REQUIRE manual approval
├─ Database migration? → REQUIRE manual approval
├─ Destructive action? → REQUIRE manual approval
└─ Information-only? → OK to proceed
```

### 3. Human Review Pending
```
If human review needed:
├─ Is review pending? → SKIP action, wait for review
├─ Can action proceed in parallel? → YES, proceed
└─ Is decision already made? → YES, proceed
```

### 4. Resource Constraints
```
If resource-heavy operation:
├─ CPU/Memory available? → YES → Execute
├─ Under heavy load? → DEFER to next available slot
└─ Could cause outage? → SKIP or ASK FIRST
```

## Learning Loop

After each decision:

```
1. Record:
   ├─ Trigger pattern
   ├─ Decision made
   ├─ Confidence score
   ├─ Action executed
   └─ Result (success/failure)

2. Evaluate:
   ├─ Was decision correct?
   ├─ Was confidence accurate?
   ├─ What would improve accuracy?
   └─ Store for future use

3. Update:
   ├─ If similar trigger occurs: Use learned pattern
   ├─ If pattern changed: Adjust confidence factors
   ├─ If new pattern: Add to database
   └─ If mistake: Reduce future confidence for this pattern
```

## Override Capability

Brian can override CC Agent decisions:

```
Commands:
├─ "cc pause" → Stop all actions, keep monitoring
├─ "cc skip" → Skip current decision, wait for next trigger
├─ "cc force <action>" → Force action despite low confidence
├─ "cc learn <pattern>" → Teach CC a new pattern
└─ "cc report" → Show recent decisions + confidence scores
```

---

_Last updated: 2026-02-19_
