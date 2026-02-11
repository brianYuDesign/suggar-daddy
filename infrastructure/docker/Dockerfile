# Multi-stage Dockerfile for NestJS Microservices

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package files
COPY package*.json ./
COPY yarn.lock ./
COPY tsconfig*.json ./
COPY nx.json ./

# 安裝依賴（包含 dev dependencies）
RUN yarn install --frozen-lockfile

# 複製所有原始碼
COPY . .

# Build argument for service name
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Build the specific app
RUN npx nx build ${APP_NAME} --prod

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# 安裝 dumb-init (處理 signals)
RUN apk add --no-cache dumb-init

# 建立 non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 複製 package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/yarn.lock ./

# 只安裝 production dependencies
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# ARG for service name
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# 複製 build 產出
COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/${APP_NAME} ./dist

# 切換到 non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 啟動
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
