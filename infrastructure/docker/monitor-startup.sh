#!/bin/bash
# 自動監控 Docker 測試環境啟動

cd /Users/brianyu/Project/suggar-daddy/infrastructure/docker

echo "🔍 監控 Docker 測試環境啟動..."
echo ""

MAX_WAIT=300  # 最多等待 5 分鐘
ELAPSED=0
CHECK_INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    echo "⏱️  已等待 ${ELAPSED}s / ${MAX_WAIT}s"
    
    # 檢查容器狀態
    STATUS=$(docker-compose -f docker-compose.test.yml ps --format json 2>/dev/null)
    
    if [ -n "$STATUS" ]; then
        # 檢查是否所有容器都 healthy
        POSTGRES_HEALTHY=$(docker inspect suggar-daddy-postgres-test --format='{{.State.Health.Status}}' 2>/dev/null)
        REDIS_HEALTHY=$(docker inspect suggar-daddy-redis-test --format='{{.State.Health.Status}}' 2>/dev/null)
        KAFKA_HEALTHY=$(docker inspect suggar-daddy-kafka-test --format='{{.State.Health.Status}}' 2>/dev/null)
        
        echo "  📊 PostgreSQL: ${POSTGRES_HEALTHY:-starting}"
        echo "  📊 Redis: ${REDIS_HEALTHY:-starting}"
        echo "  📊 Kafka: ${KAFKA_HEALTHY:-starting}"
        
        if [ "$POSTGRES_HEALTHY" = "healthy" ] && \
           [ "$REDIS_HEALTHY" = "healthy" ] && \
           [ "$KAFKA_HEALTHY" = "healthy" ]; then
            echo ""
            echo "✅ 所有服務已啟動並健康！"
            echo ""
            docker-compose -f docker-compose.test.yml ps
            exit 0
        fi
    else
        echo "  ⏳ 容器尚未建立，繼續等待..."
    fi
    
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
    echo ""
done

echo "⚠️  等待超時（${MAX_WAIT}s）"
echo "當前狀態："
docker-compose -f docker-compose.test.yml ps
exit 1
