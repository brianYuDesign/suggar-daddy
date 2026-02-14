#!/bin/bash

echo "=== 重啟 Auth Service ==="

echo "1. 檢查當前容器狀態..."
docker ps | grep auth-service || echo "容器未運行"

echo ""
echo "2. 停止 auth-service 容器..."
docker stop suggar-daddy-auth-service 2>&1

echo ""
echo "3. 移除 auth-service 容器..."
docker rm suggar-daddy-auth-service 2>&1

echo ""
echo "4. 重新啟動 auth-service..."
cd /Users/brianyu/Project/suggar-daddy
docker compose up -d auth-service

echo ""
echo "5. 等待服務啟動..."
sleep 10

echo ""
echo "6. 檢查服務狀態..."
docker ps | grep auth-service

echo ""
echo "7. 查看最新日誌..."
docker logs suggar-daddy-auth-service --tail 30

echo ""
echo "=== 完成 ==="
