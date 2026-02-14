#!/bin/bash

echo "======================================"
echo "檢查服務連接狀態"
echo "======================================"
echo ""

# 檢查 Redis
echo "1. 檢查 Redis (localhost:6379)..."
if timeout 2 bash -c "echo -e 'PING\r\n' | nc localhost 6379" 2>/dev/null | grep -q "PONG"; then
  echo "   ✓ Redis 連接成功"
else
  echo "   ✗ Redis 連接失敗"
fi
echo ""

# 檢查 Kafka
echo "2. 檢查 Kafka (localhost:9092)..."
if timeout 2 bash -c "echo '' | nc -z localhost 9092" 2>/dev/null; then
  echo "   ✓ Kafka 端口可訪問"
else
  echo "   ✗ Kafka 端口無法訪問"
fi
echo ""

# 檢查 Auth Service
echo "3. 檢查 Auth Service (localhost:3002)..."
if timeout 2 curl -s http://localhost:3002 > /dev/null 2>&1; then
  echo "   ✓ Auth Service 運行中"
else
  echo "   ✗ Auth Service 無響應"
fi
echo ""

# 檢查 API Gateway
echo "4. 檢查 API Gateway (localhost:3000)..."
if timeout 2 curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "   ✓ API Gateway 運行中"
else
  echo "   ✗ API Gateway 無響應"
fi
echo ""

echo "======================================"
echo "服務檢查完成"
echo "======================================"
