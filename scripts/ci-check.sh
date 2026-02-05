#!/usr/bin/env bash
# CI 檢查：依序執行 lint、test，任一失敗即結束
# 用法：./scripts/ci-check.sh  或  npm run ci:check

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo ">>> Lint"
npm run lint

echo ""
echo ">>> Test"
npm run test

echo ""
echo ">>> ci-check 通過"
