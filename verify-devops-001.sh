#!/bin/bash

# DevOps-001 Docker & CI/CD 驗證腳本
# 檢查所有必需文件是否已創建

echo "🔍 驗證 DevOps-001 Docker & CI/CD 配置..."
echo "==========================================\n"

PASS=0
FAIL=0

# 檢查函數
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
        ((PASS++))
    else
        echo "❌ $1 (缺失)"
        ((FAIL++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1"
        ((PASS++))
    else
        echo "❌ $1 (缺失)"
        ((FAIL++))
    fi
}

echo "📦 檢查 Dockerfiles..."
check_file "recommendation-service/Dockerfile"
check_file "content-streaming-service/Dockerfile"
echo ""

echo "🐳 檢查 Docker Compose..."
check_file "docker-compose.yml"
echo ""

echo "🔧 檢查環境變量配置..."
check_file ".env.example"
check_file ".env.test"
echo ""

echo "📝 檢查初始化腳本..."
check_file "scripts/init-db.sql"
echo ""

echo "🚀 檢查 GitHub Actions 工作流..."
check_dir ".github/workflows"
check_file ".github/workflows/ci-feature.yml"
check_file ".github/workflows/ci-main.yml"
check_file ".github/workflows/release.yml"
echo ""

echo "📚 檢查文檔..."
check_file "DOCKER-GUIDE.md"
check_file "CI-CD-SETUP.md"
check_file "DOCKER-QUICK-REF.md"
check_file "DEVOPS-001-SUMMARY.md"
echo ""

echo "🛡️ 檢查 .dockerignore..."
check_file "recommendation-service/.dockerignore"
check_file "content-streaming-service/.dockerignore"
echo ""

echo "==========================================\n"
echo "📊 驗證結果:"
echo "✅ 通過: $PASS 項"
echo "❌ 失敗: $FAIL 項"

if [ $FAIL -eq 0 ]; then
    echo "\n🎉 所有檢查通過！DevOps-001 配置完整。\n"
    exit 0
else
    echo "\n⚠️ 存在 $FAIL 項缺失。請檢查上述文件。\n"
    exit 1
fi
