#!/bin/bash
# CC Webhook Server - Listens for git push events and triggers CC Agent

PORT=18789
LOG_FILE="$HOME/.openclaw/workspace/cc-webhook.log"

# Start webhook server (using nc or similar)
echo "🚀 CC Webhook Server starting on port $PORT..." | tee "$LOG_FILE"

# Simple webhook receiver using bash + netcat
# On macOS, use nc; on Linux use nc or ncat
while true; do
  {
    # Read HTTP request
    read -t 5 method path version 2>/dev/null || true
    
    if [[ "$path" == "/webhook/suggar-daddy-cc" && "$method" == "POST" ]]; then
      # Read headers and body
      while read -t 1 line; do
        [[ -z "$line" || "$line" == $'\r' ]] && break
      done
      
      # Read JSON body
      read -t 5 body 2>/dev/null || body=""
      
      if [ -n "$body" ]; then
        echo "[$(date)] Received CC trigger: $body" >> "$LOG_FILE"
        
        # Trigger CC Agent via cron/agent
        # Extract tags and pass to agent
        TAGS=$(echo "$body" | jq -r '.tags' 2>/dev/null || echo "")
        MESSAGE="CC triggered: $TAGS"
        
        # Queue work (non-blocking)
        echo "$MESSAGE" >> "$HOME/.openclaw/workspace/cc-queue.jsonl"
      fi
      
      # Send HTTP 200 response
      echo -e "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK" 
    else
      echo -e "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\n\r\nNot Found"
    fi
  } | nc -l localhost $PORT 2>/dev/null || true
done
