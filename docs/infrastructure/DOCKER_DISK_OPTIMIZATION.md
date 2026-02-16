# Docker 磁盤空間優化指南

## 問題說明
遇到 `no space left on device` 錯誤時，表示 Docker 佔用了過多磁盤空間。

## 立即解決方案

### 手動深度清理
```bash
# 停止所有容器
docker-compose down

# 清理所有未使用的資源（包括 volumes）
docker system prune -af --volumes

# 清理懸空的 volumes
docker volume prune -f

# 清理舊的 build cache
docker builder prune -af
```

## 優化策略

### 按需啟動服務
```bash
# 只啟動資料庫服務
docker-compose up -d postgres-master redis-master

# 只啟動基礎設施
docker-compose up -d postgres-master redis-master kafka jaeger

# 啟動特定服務
docker-compose up -d api-gateway auth-service user-service
```

### 使用 Profiles 啟動可選服務
```bash
# 啟動所有服務（包括 frontend）
docker-compose --profile frontend up -d

# 啟動完整服務（包括 optional services）
docker-compose --profile full up -d
```

## 定期維護

### 每日清理
```bash
# 清理未使用的 images（保留最近 24 小時）
docker image prune -af --filter "until=24h"

# 清理 build cache（保留最近 24 小時）
docker builder prune -af --filter "unused-for=24h"
```

### 每週清理
```bash
# 完整清理（不刪除 volumes）
docker system prune -af

# 檢查磁盤使用
docker system df -v
```

### 每月深度清理
```bash
# ⚠️ 警告：這會刪除所有未使用的 volumes（包括資料）
docker system prune -af --volumes

# 之後需要重新初始化資料庫
docker-compose up -d postgres-master
```

## 優化 Dockerfile

### 使用 .dockerignore
確保 `.dockerignore` 包含：
```
node_modules
dist
.git
.github
coverage
*.log
.next
.env*
```

### 多階段構建
```dockerfile
# 使用多階段構建減少 image 大小
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
CMD ["npm", "start"]
```

## 監控磁盤使用

### 檢查 Docker 磁盤使用
```bash
# 總覽
docker system df

# 詳細資訊
docker system df -v

# 查看最大的 images
docker images --format "{{.Size}}\t{{.Repository}}:{{.Tag}}" | sort -h

# 查看最大的 volumes
docker volume ls -q | xargs docker volume inspect | \
  jq -r '.[] | "\(.Mountpoint)\t\(.Name)"' | \
  xargs -I {} sh -c 'du -sh $(echo {} | cut -f1) 2>/dev/null && echo $(echo {} | cut -f2)'
```

### 設置磁盤空間警報
```bash
# 檢查 Docker 磁盤使用率
THRESHOLD=80
USAGE=$(df -h | grep '/var/lib/docker' | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
  echo "Docker 磁盤使用率超過 ${THRESHOLD}%（當前：${USAGE}%）"
  echo "建議執行: docker system prune -af"
fi
```

## 開發環境對比

| 配置 | 啟動時間 | 記憶體使用 | 磁盤空間 | 用途 |
|------|---------|-----------|---------|------|
| `docker-compose.yml` | ~60s | ~8GB | ~25GB | 完整環境 |
| 按需啟動 | ~10s | ~1GB | ~3GB | 單一服務開發 |

## 最佳實踐

1. **按需啟動服務**
   ```bash
   docker-compose up -d postgres-master redis-master kafka jaeger
   ```

2. **定期清理（加入 crontab）**
   ```bash
   # 每天凌晨 2 點清理
   0 2 * * * docker image prune -af --filter "until=24h" >> /var/log/docker-cleanup.log 2>&1
   ```

3. **使用 BuildKit 加速構建**
   ```bash
   export DOCKER_BUILDKIT=1
   export COMPOSE_DOCKER_CLI_BUILD=1
   ```

4. **限制日誌大小**（已在 docker-compose.yml 中配置）
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

5. **使用 volumes 而非 bind mounts**
   - Volumes 效能更好
   - 更容易備份和管理
   - 不會在清理時意外刪除源代碼

## 緊急情況

如果磁盤空間嚴重不足：

```bash
# 1. 立即停止所有容器
docker stop $(docker ps -aq)

# 2. 刪除所有停止的容器
docker container prune -f

# 3. 刪除所有未使用的 images
docker image prune -af

# 4. 刪除所有未使用的 volumes
docker volume prune -f

# 5. 清理 build cache
docker builder prune -af

# 6. 重啟 Docker Desktop（macOS）
osascript -e 'quit app "Docker"'
open -a Docker

# 7. 重新啟動服務
docker-compose up -d
```

## 相關資源

- [Docker 官方清理指南](https://docs.docker.com/config/pruning/)
- [Docker Desktop 磁盤管理](https://docs.docker.com/desktop/settings/mac/#disk)
- 項目文檔: `docs/04-運維與效能.md`
