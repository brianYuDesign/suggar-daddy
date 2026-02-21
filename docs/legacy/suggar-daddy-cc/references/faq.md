# FAQ - Frequently Asked Questions

## Getting Started

### Q: How do I enable CC Agent for my project?

A: Follow these steps:

1. Load the skill:
```bash
openclaw skill load ~/.openclaw/workspace/skills/suggar-daddy-cc/
```

2. Create cron job:
```bash
cron add --job '{
  "name": "suggar-daddy-cc",
  "schedule": { "kind": "every", "everyMs": 300000 },
  "payload": { "kind": "agentTurn", "message": "Monitor project and execute workflows" },
  "sessionTarget": "isolated"
}'
```

3. Verify it's running:
```bash
cron list | grep suggar-daddy-cc
```

### Q: Can I use CC Agent without Telegram?

A: Not currently. CC Agent relies on Telegram for notifications. You can:
- Set up a personal Telegram account
- Use Telegram's Desktop or Web client
- Configure notification routing to silent mode (logs only)

### Q: How often does CC Agent run?

A: Default is every **5 minutes** (300,000 ms). You can adjust:

```bash
# Change to every 10 minutes
cron update --jobId <id> --patch '{"schedule": {"everyMs": 600000}}'

# Change to every 1 hour
cron update --jobId <id> --patch '{"schedule": {"everyMs": 3600000}}'
```

## Triggers & Workflows

### Q: I pushed code but CC Agent didn't run tests. Why?

A: Check your commit message. Did you include a trigger tag?

```bash
# ✅ These work:
git commit -m "[backend] Add new feature"
git commit -m "[frontend] Update UI"
git commit -m "[docs] Update README"

# ❌ These don't trigger:
git commit -m "Add new feature"
git commit -m "WIP: something"
```

### Q: Can I trigger workflows manually?

A: Yes! Use these commands:

```bash
# Run backend tests
cc run test:unit

# Run frontend build
cc run build:frontend

# Run health check
cc run health-check

# Run full deployment validation
cc run validate:deploy
```

### Q: What if I don't want CC Agent to run certain workflows?

A: Disable specific triggers:

```bash
# View current triggers
cc triggers list

# Disable a trigger
cc triggers disable <trigger-name>

# Enable a trigger
cc triggers enable <trigger-name>
```

## Errors & Debugging

### Q: How do I see what CC Agent is doing?

A: View the decision log:

```bash
# Last 20 decisions
tail -20 ~/.openclaw/workspace/suggar-daddy-cc-decisions.json | jq

# View with pretty formatting
jq '.' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json | less

# Check success rate
jq '.patterns | map(.success_rate)' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json
```

### Q: CC Agent made a wrong decision. How do I provide feedback?

A: Use the learn command:

```bash
# Tell CC: This should have triggered workflow X
cc learn "pattern=commit-with-[backend], decision=should-run-tests"

# Tell CC: That test failure was not a mock issue
cc learn "error-type=MockError, actual=LogicError"

# View learned patterns
cc patterns show
```

### Q: How do I pause CC Agent temporarily?

A: Use the pause command:

```bash
# Pause all workflows
cc pause

# Pause for specific time
cc pause 2h

# Resume
cc resume
```

## Notifications

### Q: I'm getting too many notifications. How do I filter?

A: Adjust notification rules:

```bash
# Only get CRITICAL alerts
cc notify level=critical

# Only get backend notifications
cc notify channel=g-backend-devops

# Batch all non-critical into one daily email
cc notify batch-mode=on batch-time=09:00
```

### Q: Can I get notifications via email instead of Telegram?

A: Currently no, but you can:
- Use IFTTT to forward Telegram to email
- Set up a bot bridge to email
- Export notification history daily

### Q: How do I know if I missed a notification?

A: Check the notification log:

```bash
# View all notifications sent in last hour
jq '.notifications | select(.timestamp > now-3600)' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json

# View failed notifications
jq '.notifications | select(.status == "failed")' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json
```

## Performance & Reliability

### Q: Is CC Agent slow? How long do workflows take?

A: Typical timings:

| Workflow | Time |
|----------|------|
| Backend tests | 3-5 min |
| Frontend build | 4-6 min |
| Health check | 2-3 min |
| Test analysis | 1-2 min |
| Deployment validation | 8-12 min |

You can view actual timings:

```bash
jq '.decisions[] | {trigger, duration_ms}' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json
```

### Q: Can CC Agent handle multiple events at the same time?

A: Yes, but with rules:

- **Sequential**: Heavy workflows (tests, builds) run one at a time
- **Parallel**: Light workflows (checks) can run in parallel
- **Queued**: If queue overflows, new events are queued

Check current queue:

```bash
cc queue status
```

### Q: What happens if CC Agent crashes?

A: It will restart automatically via the cron job. To manually restart:

```bash
# View running job
cron list | grep suggar-daddy-cc

# Restart the job
cron run --jobId <id>

# View run history
cron runs --jobId <id>
```

## Advanced Usage

### Q: Can I create custom workflows?

A: Yes! Define in `suggar-daddy-cc-triggers.json`:

```json
{
  "name": "my-custom-workflow",
  "condition": "When my custom condition",
  "actions": [
    { "type": "script", "path": "./my-script.sh" },
    { "type": "notify", "channel": "g-backend-devops" }
  ],
  "priority": "medium"
}
```

Then restart CC Agent:

```bash
cc reload
```

### Q: Can I integrate CC Agent with other tools?

A: Yes! CC Agent can call webhooks:

```json
{
  "name": "notify-slack",
  "actions": [
    {
      "type": "webhook",
      "url": "https://hooks.slack.com/...",
      "method": "POST",
      "data": { "text": "Test passed!" }
    }
  ]
}
```

### Q: Can I have multiple CC Agent instances?

A: Yes, but not recommended. If needed:

1. Create separate cron jobs:
```bash
cron add --job '{"name": "cc-instance-1", ...}'
cron add --job '{"name": "cc-instance-2", ...}'
```

2. Configure different triggers for each

3. Monitor carefully for conflicts

### Q: How do I backup CC Agent's learning data?

A: The data is stored in JSON files:

```bash
# Backup decision history
cp ~/.openclaw/workspace/suggar-daddy-cc-decisions.json \
   ~/.openclaw/workspace/backups/decisions-$(date +%Y%m%d).json

# Backup triggers
cp ~/.openclaw/workspace/suggar-daddy-cc-triggers.json \
   ~/.openclaw/workspace/backups/triggers-$(date +%Y%m%d).json

# Set up automated daily backup
cc backup daily
```

## Safety & Permissions

### Q: Can CC Agent delete files or make destructive changes?

A: No. CC Agent has built-in safety guards:

- ✅ Can read files and logs
- ✅ Can run tests and builds
- ✅ Can restart services
- ❌ Cannot delete files
- ❌ Cannot modify database
- ❌ Cannot deploy to production without approval

### Q: What if CC Agent makes a mistake?

A: Use the override command:

```bash
# Undo last decision
cc undo

# View undo history
cc undo history

# Restore to specific point
cc restore --timestamp "2026-02-19 08:00"
```

### Q: Can I audit what CC Agent did?

A: Yes! Full audit trail is available:

```bash
# View all actions in last hour
jq '.decisions | select(.timestamp > now-3600)' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json

# Export audit log
jq '.decisions' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json > audit.json

# View specific trigger history
jq '.decisions | select(.trigger == "backend-push")' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json
```

## Troubleshooting

### Q: I'm seeing "confidence too low" errors

A: This means CC Agent is unsure about its decision. Check:

1. Is this a new pattern? → CC hasn't learned it yet
2. Are multiple signals conflicting? → Fix root cause
3. Is confidence truly <70%? → Override with `cc force`

View confidence history:

```bash
jq '.decisions | select(.confidence < 0.7)' ~/.openclaw/workspace/suggar-daddy-cc-decisions.json
```

### Q: Notifications are going to the wrong channel

A: Check routing rules:

```bash
# View current routing
cc routes list

# Fix routing
cc routes update --trigger backend-push --channel g-backend-devops
```

### Q: CC Agent is not picking up my git commits

A: Check git configuration:

```bash
# Verify repo is accessible
git -C ~/Project/suggar-daddy status

# Check git hooks
ls ~/Project/suggar-daddy/.git/hooks/

# Verify OpenClaw has repo access
openclaw status
```

## Getting Help

### Q: Where do I ask for help?

A: Options:

1. Check this FAQ first
2. Read the reference docs (TRIGGERS.md, WORKFLOWS.md)
3. Check decision logs for clues
4. Ask Brian (@szuyuyu on Telegram)

### Q: How do I report a bug?

A: Create an issue with:

1. What CC Agent did (or tried to do)
2. What the error was
3. Decision log snippet (relevant line from cc-decisions.json)
4. Steps to reproduce

---

_Last updated: 2026-02-19_
