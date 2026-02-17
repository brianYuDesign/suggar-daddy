# 部署腳本

這個目錄包含用於部署 Suggar Daddy 應用到不同環境的腳本。

## 腳本概覽

| 腳本 | 用途 | 環境 |
|------|------|------|
| `deploy-dev.sh` | 開發環境部署 | Local/Docker |
| `deploy-staging.sh` | Staging 環境部署 | Staging Server |
| `deploy-prod.sh` | 生產環境部署 | Production Server |

## 快速開始

### 開發環境部署

```bash
# 標準部署
./scripts/deploy/deploy-dev.sh

# 模擬部署（不實際執行）
./scripts/deploy/deploy-dev.sh --dry-run

# 跳過構建步驟
./scripts/deploy/deploy-dev.sh --skip-build
```

### Staging 環境部署

```bash
# 標準部署
./scripts/deploy/deploy-staging.sh

# 模擬部署
./scripts/deploy/deploy-staging.sh --dry-run

# 帶 Slack 通知
./scripts/deploy/deploy-staging.sh --notify-slack
```

### 生產環境部署 ⚠️

```bash
# 強烈建議先執行模擬部署
./scripts/deploy/deploy-prod.sh --dry-run

# 標準生產部署（需要多次確認）
./scripts/deploy/deploy-prod.sh

# 緊急修復（跳過測試）
./scripts/deploy/deploy-prod.sh --skip-tests --force

# 帶 Slack/Discord 通知
./scripts/deploy/deploy-prod.sh --notify-slack --notify-discord

# 回滾到上一個版本
./scripts/deploy/deploy-prod.sh --rollback
```

## deploy-prod.sh 詳細說明

### 部署流程

1. **環境檢查**
   - Docker 環境檢查
   - 環境變數驗證
   - Secrets 檢查
   - 網路連通性測試

2. **前置備份**
   - 資料庫備份
   - Docker Compose 配置備份
   - 記錄當前運行版本

3. **運行測試**
   - 單元測試
   - 集成測試（可選）

4. **構建 Production Images**
   - api-gateway
   - auth-service
   - user-service
   - payment-service
   - subscription-service
   - db-writer-service
   - content-service
   - media-service

5. **資料庫遷移**
   - 執行待處理的遷移
   - 驗證遷移結果

6. **滾動部署**
   - 基礎設施服務檢查
   - 後端服務滾動更新
   - 前端服務部署

7. **健康檢查**
   - API Gateway 健康檢查
   - 各微服務健康檢查
   - 資料庫連接檢查
   - Redis 連接檢查

8. **清理與通知**
   - 清理舊的 Docker 鏡像
   - 發送部署通知

### 選項說明

| 選項 | 說明 |
|------|------|
| `--dry-run` | 模擬部署，顯示將執行的操作但不實際執行 |
| `--skip-build` | 跳過 Docker 鏡像構建 |
| `--skip-backup` | 跳過部署前備份（不建議） |
| `--skip-tests` | 跳過測試（緊急修復時使用） |
| `--force` | 強制部署，繞過部分確認提示 |
| `--rollback` | 執行回滾操作 |
| `--notify-slack` | 發送 Slack 通知 |
| `--notify-discord` | 發送 Discord 通知 |

### 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `DEPLOY_HOST` | prod.suggar-daddy.com | 部署目標主機 |
| `DEPLOY_USER` | deploy | 部署用戶 |
| `DEPLOY_DIR` | /var/www/suggar-daddy | 部署目錄 |
| `SLACK_WEBHOOK_URL` | - | Slack Webhook URL |
| `DISCORD_WEBHOOK_URL` | - | Discord Webhook URL |

### 安全特性

- **多重確認**: 生產部署需要兩次確認
- **自動備份**: 部署前自動備份資料庫和配置
- **健康檢查**: 部署後自動執行健康檢查
- **自動回滾**: 健康檢查失敗時可自動回滾
- **權限檢查**: 自動檢查 secrets 檔案權限

### 回滾操作

如果部署出現問題，可以使用以下命令回滾：

```bash
# 自動回滾到上一個版本
./scripts/deploy/deploy-prod.sh --rollback

# 手動指定版本回滾（需手動修改 docker-compose.yml）
docker-compose down
docker tag suggar-daddy/api-gateway:old-version suggar-daddy/api-gateway:latest
# ... 對其他服務執行相同操作
docker-compose up -d
```

## 注意事項

1. **生產部署前務必執行 `--dry-run`**
2. **確保在低環境（dev/staging）測試通過後再部署到生產**
3. **部署時確保團隊成員在線，以便處理可能的問題**
4. **建議在業務低峰期進行生產部署**
5. **部署前確保已配置通知渠道（Slack/Discord）**

## CI/CD 整合

這些腳本可以在 CI/CD 管道中使用：

```yaml
# GitHub Actions 示例
- name: Deploy to Production
  run: |
    export SLACK_WEBHOOK_URL="${{ secrets.SLACK_WEBHOOK_URL }}"
    ./scripts/deploy/deploy-prod.sh --force --notify-slack
  env:
    DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
    DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
```
