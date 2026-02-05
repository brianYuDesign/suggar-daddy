# 自動化腳本

從專案根目錄執行。

## ci-check（僅檢查）

跑完 **lint** 再跑 **test**，任一失敗即結束，適合 CI 或提交前手動檢查。

```bash
npm run ci:check
# 或
./scripts/ci-check.sh
```

## commit（檢查通過再提交）

依序執行 **lint → test**，全部通過後才 `git add -A` 並 `git commit`。

```bash
# 一般用法（message 可含空格）
npm run commit -- "feat: add login"
npm run commit -- -m "fix: typo in auth"

# 只跑檢查、不提交
./scripts/commit.sh --no-commit

# 跳過檢查、只提交（慎用）
./scripts/commit.sh --skip-check "hotfix: emergency"
```

| 選項 | 說明 |
|------|------|
| `--no-commit` | 只執行 lint + test，不執行 git commit |
| `--skip-check` | 不執行 lint/test，直接 commit |
| `-m "訊息"` | 指定 commit message |
