#!/bin/bash

# 批量更新所有服務使用 @InjectLogger() 裝飾器
# 這個腳本會：
# 1. 在 import 中添加 InjectLogger
# 2. 替換 logger 聲明

echo "🚀 開始批量更新 logger 使用..."

# 查找所有包含 "private readonly logger = new Logger" 的文件
files=$(grep -rl "private readonly logger = new Logger" apps/)

total=0
updated=0

for file in $files; do
  total=$((total + 1))
  echo ""
  echo "📄 處理文件: $file"
  
  # 檢查是否已經導入 InjectLogger
  if grep -q "InjectLogger" "$file"; then
    echo "   ⏭️  已經使用 InjectLogger，跳過"
    continue
  fi
  
  # 檢查是否從 @suggar-daddy/common 導入
  if grep -q "from '@suggar-daddy/common'" "$file"; then
    # 在 @suggar-daddy/common 的 import 中添加 InjectLogger
    if grep -q "import {.*} from '@suggar-daddy/common'" "$file"; then
      # 單行 import
      sed -i '' "s/from '@suggar-daddy\/common'/,InjectLogger } from '@suggar-daddy\/common'/g" "$file"
      sed -i '' "s/{ ,/{ /g" "$file"  # 清理可能的 "{ ,"
    else
      echo "   ⚠️  多行 import，需要手動處理"
      continue
    fi
  else
    # 沒有從 @suggar-daddy/common 導入，添加新的 import
    # 在第一個 import 語句後添加
    sed -i '' "1a\\
import { InjectLogger } from '@suggar-daddy/common';
" "$file"
  fi
  
  # 替換 logger 聲明
  # 從: private readonly logger = new Logger(ClassName.name);
  # 到: @InjectLogger() private readonly logger!: Logger;
  sed -i '' 's/private readonly logger = new Logger([^;]*);/@InjectLogger()\n  private readonly logger!: Logger;/g' "$file"
  
  updated=$((updated + 1))
  echo "   ✅ 已更新"
done

echo ""
echo "=========================================="
echo "📊 更新完成！"
echo "   總文件數: $total"
echo "   已更新: $updated"
echo "   跳過: $((total - updated))"
echo "=========================================="
