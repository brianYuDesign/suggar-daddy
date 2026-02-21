# 🚀 Docker & CI/CD 快速參考

## 本地開發 (Docker)

```bash
# 首次設置
cp .env.example .env
docker-compose up --build

# 快速啟動
docker-compose up

# 後台運行
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down
```

## 服務健康檢查

```bash
# Recommendation Service
curl http://localhost:3000/health

# Content-Streaming Service
curl http://localhost:3001/health

# 查看所有容器
docker-compose ps
```

## 開發命令

### Recommendation Service

```bash
cd recommendation-service

npm run dev          # 開發模式
npm run build        # 構建
npm run test         # 運行測試
npm run lint         # 代碼檢查 + 修復
npm run test:cov     # 覆蓋率報告
```

### Content-Streaming Service

```bash
cd content-streaming-service

npm run dev          # 開發模式
npm run build        # 構建
npm run test         # 運行測試
npm run lint         # 代碼檢查 + 修復
```

## Docker Compose 進階

```bash
# 重新構建單個服務
docker-compose build recommendation
docker-compose build content-streaming

# 執行命令在容器中
docker-compose exec recommendation npm run test
docker-compose exec postgres psql -U postgres

# 進入容器 shell
docker-compose exec recommendation sh

# 查看特定服務日誌
docker-compose logs -f recommendation
docker-compose logs -f content-streaming
docker-compose logs -f postgres

# 清理所有數據
docker-compose down -v

# 只運行數據庫
docker-compose up postgres redis
```

## Git 工作流

```bash
# Feature 分支開發
git checkout -b feature/your-feature
# ... 編輯代碼 ...
git add .
git commit -m "feat: description"
git push origin feature/your-feature

# 創建 Pull Request
# GitHub UI: 新建 PR 到 main

# 版本發佈
git tag v1.0.0
git push origin v1.0.0
```

## CI/CD 觸發

| 事件 | 工作流 | 用途 |
|------|--------|------|
| push feature/* | ci-feature.yml | Lint + Test (快速) |
| push main | ci-main.yml | 完整 CI + Docker 推送 |
| tag v*.*.* | release.yml | 發佈版本鏡像 |

## 環境變量

```bash
# 複製示例
cp .env.example .env

# 關鍵變量
NODE_ENV=development
DATABASE_HOST=postgres
REDIS_HOST=redis
LOG_LEVEL=debug
```

## 故障排除

```bash
# 服務無法啟動
docker-compose logs                    # 查看詳細日誌

# 端口被佔用
lsof -i :3000                         # 查看 3000 端口

# 重新初始化
docker-compose down -v                # 刪除卷
docker-compose up --build             # 重新構建

# 進容器調試
docker-compose exec recommendation npm run build
docker-compose exec postgres pg_isready
```

## Docker Hub 推送

須先配置 GitHub Secrets:
- `DOCKER_USERNAME`: Docker Hub 用戶名
- `DOCKER_PASSWORD`: Docker Hub 訪問令牌

推送到：
- `$DOCKER_USERNAME/sugar-daddy-recommendation:latest`
- `$DOCKER_USERNAME/sugar-daddy-content-streaming:latest`

## 有用的鏈接

- 📖 [完整開發指南](./DOCKER-GUIDE.md)
- 🔧 [CI/CD 設置指南](./CI-CD-SETUP.md)
- 📋 [GitHub Actions](https://docs.github.com/actions)
- 🐳 [Docker 文檔](https://docs.docker.com)

---

**更新時間**: 2026-02-19
