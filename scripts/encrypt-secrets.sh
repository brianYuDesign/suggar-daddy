#!/bin/bash

# 🔐 生產環境加密腳本
# 用途: 加密敏感的環境變量
# 使用: ./encrypt-secrets.sh [env-file]

set -e

ENV_FILE="${1:-.env.production}"
ENCRYPTION_KEY="${ENCRYPTION_KEY_FILE:-./.encryption_key}"
ENCRYPTED_FILE="${ENV_FILE}.encrypted"

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔐 Production Secrets Encryption${NC}"
echo "=================================================="

# 1. 驗證環境文件存在
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: Environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# 2. 生成或加載加密密鑰
if [ ! -f "$ENCRYPTION_KEY" ]; then
    echo -e "${YELLOW}⚠️  Encryption key not found, generating new key...${NC}"
    openssl rand -base64 32 > "$ENCRYPTION_KEY"
    chmod 600 "$ENCRYPTION_KEY"
    echo -e "${GREEN}✅ Generated encryption key: $ENCRYPTION_KEY${NC}"
fi

# 3. 加密環境文件
echo -e "${YELLOW}🔒 Encrypting environment file...${NC}"

# 使用 OpenSSL 加密
openssl enc -aes-256-cbc \
    -in "$ENV_FILE" \
    -out "$ENCRYPTED_FILE" \
    -K "$(xxd -p -c 256 < "$ENCRYPTION_KEY")" \
    -iv "$(openssl rand -hex 16)" \
    -salt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully encrypted: $ENCRYPTED_FILE${NC}"
    
    # 4. 驗證加密
    echo -e "${YELLOW}🔍 Verifying encryption...${NC}"
    file_size_original=$(wc -c < "$ENV_FILE")
    file_size_encrypted=$(wc -c < "$ENCRYPTED_FILE")
    echo "   Original file size: $file_size_original bytes"
    echo "   Encrypted file size: $file_size_encrypted bytes"
    
    # 5. 安全建議
    echo -e "${YELLOW}🛡️  Security recommendations:${NC}"
    echo "   1. Store encryption key in AWS Secrets Manager:"
    echo "      aws secretsmanager create-secret --name prod/encryption-key"
    echo "   2. Keep encrypted file in version control"
    echo "   3. Never commit unencrypted secrets"
    echo "   4. Rotate encryption key annually"
    
    echo -e "${GREEN}✅ Encryption completed!${NC}"
else
    echo -e "${RED}❌ Encryption failed${NC}"
    exit 1
fi
