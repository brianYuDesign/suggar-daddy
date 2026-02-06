# 自動化腳本

從專案根目錄執行。

## ci-check（僅檢查）

跑完 **lint** 再跑 **test**，任一失敗即結束，適合 CI 或提交前手動檢查。

```bash
npm run ci:check
# 或
./scripts/ci-check.sh
```

### 錯誤會出現在哪裡

| 階段 | 指令 | 錯誤長相 | 怎麼看／怎麼修 |
|------|------|----------|----------------|
| **Lint** | `nx run-many -t lint --all` | `NX   Failed to load 3 default Nx plugin(s):` 或 `Failed to start plugin worker` | Nx plugin 無法啟動（常見於 CI／沙箱）。用 fallback：`SKIP_NX=1 npm run ci:check`，或單獨跑 TypeScript 檢查（見下方）。 |
| **Lint** | （fallback）`tsc --noEmit -p apps/xxx/tsconfig.app.json` | `error TS2xxx: ...` 並標示**檔案路徑與行號** | 依終端機輸出的**檔案:行號**去改型別或匯入。 |
| **Test** | `nx run-many -t test --all` | 同上 Nx plugin 錯誤，或 Jest 的 `FAIL` / `Expected` | 同上；或單獨跑 `npx jest --config libs/xxx/jest.config.ts` 看該 lib 的錯誤。 |
| **Test** | （fallback）`jest --config libs/xxx/jest.config.ts` | `Preset ../../jest.preset.js not found` 或測試失敗堆疊 | 確認專案根目錄有 `jest.preset.js`；測試邏輯錯誤看堆疊裡的**檔案:行號**。 |

**想「只看錯在哪裡」時可以這樣做：**

```bash
# 只看 TypeScript 有沒有錯（會列出檔案與行號）
npx tsc --noEmit -p apps/user-service/tsconfig.app.json
npx tsc --noEmit -p apps/content-service/tsconfig.app.json
npx tsc --noEmit -p apps/db-writer-service/tsconfig.app.json

# 只看某個 lib 的測試錯在哪
npx jest --config libs/common/jest.config.ts --no-cache
```

`tsc` / Jest 的輸出裡會直接標示 **檔名:行號**，照著打開該檔案對應行即可。

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

### commit 時錯在哪裡

`npm run commit -- "訊息"` 會先跑 **ci-check**（同上）。錯誤會出現在：

1. **Lint / Test 失敗**：終端機會先印出 `>>> Lint` 或 `>>> Test`，接著就是錯誤內容（Nx 或 tsc/Jest 的檔案:行號）。
2. **檢查通過後**：才會執行 `git add` / `git commit`；若這一步失敗，會看到 git 的錯誤（例如沒有變更、衝突等）。
