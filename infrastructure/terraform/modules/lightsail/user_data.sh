#!/bin/bash
# Lightsail 實例啟動腳本

set -e

echo "=== 開始設置 ${project_name}-${environment} ==="

# 更新系統
apt-get update
apt-get upgrade -y

# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# 安裝 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 建立 ubuntu 使用者加入 docker 群組
usermod -aG docker ubuntu

# 安裝其他工具
apt-get install -y git curl vim htop

# 建立應用目錄
mkdir -p /opt/${project_name}
chown -R ubuntu:ubuntu /opt/${project_name}

# 設定 Docker 自動啟動
systemctl enable docker
systemctl start docker

echo "=== 設置完成 ==="
echo "環境: ${environment}"
echo "專案: ${project_name}"
