#!/usr/bin/env bash
# 自動化：lint → test → commit（通過才 commit）
# 用法：
#   ./scripts/commit.sh "feat: add login"
#   ./scripts/commit.sh -m "fix: typo"
#   ./scripts/commit.sh --no-commit "check only"   # 只跑 lint+test，不 commit
#   ./scripts/commit.sh --skip-check "msg"          # 跳過檢查，只 commit（慎用）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

RUN_CHECK=true
RUN_COMMIT=true
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-commit)
      RUN_COMMIT=false
      shift
      ;;
    --skip-check)
      RUN_CHECK=false
      shift
      ;;
    -m)
      shift
      COMMIT_MSG="$*"
      break
      ;;
    *)
      COMMIT_MSG="$*"
      break
      ;;
  esac
done
COMMIT_MSG=$(echo "$COMMIT_MSG" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

if [[ "$RUN_CHECK" == true ]]; then
  echo ">>> Lint"
  npm run lint
  echo ""
  echo ">>> Test"
  npm run test
  echo ""
  echo ">>> 檢查通過"
fi

if [[ "$RUN_COMMIT" == true ]]; then
  if [[ -z "$COMMIT_MSG" ]]; then
    echo "請提供 commit message，例如："
    echo "  ./scripts/commit.sh \"feat: add login\""
    echo "  ./scripts/commit.sh -m \"fix: typo\""
    exit 1bvgg/'''''32w/fgv
  fi
  git add -A
  git commit -m "$COMMIT_MSG"
  echo ">>> 已提交: $COMMIT_MSG"
fi
