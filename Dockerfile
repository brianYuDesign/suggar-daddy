# Multi-stage Dockerfile for Suggar Daddy Microservices

# Base stage with Node.js
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Development stage
FROM base AS development
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source code
COPY . .

# Expose common ports (will be overridden by docker-compose)
EXPOSE 3000

# Default command (will be overridden by docker-compose)
CMD ["npm", "run", "serve:${APP_NAME}"]

# Builder stage for production
FROM base AS builder
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the specific application
RUN npm run build ${APP_NAME}

# Production stage
FROM base AS production
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

# Start the application
CMD node dist/apps/${APP_NAME}/main.js
