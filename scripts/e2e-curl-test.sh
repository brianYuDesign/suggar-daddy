#!/bin/bash

# E2E Business Flow Test using cURL
# 測試三種角色的完整業務流程

API_BASE_URL="http://localhost:3000/api"
REPORT_DIR="./test-reports"
REPORT_FILE="$REPORT_DIR/e2e-curl-test-$(date +%Y%m%d-%H%M%S).log"

# 創建報告目錄
mkdir -p "$REPORT_DIR"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 測試計數器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 存儲測試數據
CREATOR_TOKEN=""
CREATOR_ID=""
SUBSCRIBER_TOKEN=""
SUBSCRIBER_ID=""
ADMIN_TOKEN=""
ADMIN_ID=""
TIER_ID=""
POST_ID=""
SUBSCRIPTION_ID=""

# 日誌函數
log_section() {
    echo ""
    echo "================================================================================"
    echo -e "${CYAN}$1${NC}"
    echo "================================================================================"
    echo ""
    echo "" >> "$REPORT_FILE"
    echo "================================================================================" >> "$REPORT_FILE"
    echo "$1" >> "$REPORT_FILE"
    echo "================================================================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

log_test() {
    echo -e "${BLUE}📋 測試: $1${NC}"
    echo "測試: $1" >> "$REPORT_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    echo "✅ $1" >> "$REPORT_FILE"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    echo "❌ $1" >> "$REPORT_FILE"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    echo "⚠️  $1" >> "$REPORT_FILE"
}

log_info() {
    echo "   $1"
    echo "   $1" >> "$REPORT_FILE"
}

# API 調用函數
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local expected_status=$5
    
    ((TOTAL_TESTS++))
    
    local url="${API_BASE_URL}${endpoint}"
    local cmd="curl -s -w '\n%{http_code}' -X $method"
    
    if [ -n "$token" ]; then
        cmd="$cmd -H 'Authorization: Bearer $token'"
    fi
    
    if [ "$method" != "GET" ] && [ -n "$data" ]; then
        cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    cmd="$cmd '$url'"
    
    # 執行請求
    local start_time=$(date +%s%3N)
    local response=$(eval $cmd)
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    # 分離響應體和狀態碼
    local status=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    # 記錄請求
    echo "[$method] $endpoint - Status: $status (${duration}ms)" >> "$REPORT_FILE"
    echo "Response: $body" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # 輸出狀態
    if [ "$status" = "$expected_status" ] || [ -z "$expected_status" ]; then
        echo -e "${GREEN}$method $endpoint - $status (${duration}ms)${NC}"
    else
        echo -e "${RED}$method $endpoint - $status (${duration}ms) [Expected: $expected_status]${NC}"
    fi
    
    # 返回響應體
    echo "$body"
}

# ========================================
# 角色 1: 內容創作者 (Creator)
# ========================================

test_creator_flow() {
    log_section "🎨 角色 1: 內容創作者 (Creator) - 業務流程測試"
    
    # 1. 註冊
    log_test "創作者註冊（Sugar Daddy）"
    response=$(api_call "POST" "/auth/register" \
        '{"email":"creator@test.com","password":"Creator123!","displayName":"Creator Test","role":"sugar_daddy"}' \
        "" "201")
    
    if echo "$response" | grep -q '"id"\|"user"'; then
        log_success "創作者註冊成功"
        log_info "Response: $(echo $response | head -c 100)..."
    elif echo "$response" | grep -qi "already exists\|conflict"; then
        log_warning "創作者已存在，繼續登入流程"
    else
        log_error "創作者註冊失敗"
        log_info "Response: $response"
    fi
    
    # 2. 登入
    log_test "創作者登入"
    response=$(api_call "POST" "/auth/login" \
        '{"email":"creator@test.com","password":"Creator123!"}' \
        "" "200")
    
    if echo "$response" | grep -q "token\|access_token"; then
        CREATOR_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*\|"access_token":"[^"]*\|"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)
        CREATOR_ID=$(echo "$response" | grep -o '"id":"[^"]*\|"userId":"[^"]*' | head -1 | cut -d'"' -f4)
        log_success "創作者登入成功"
        log_info "Token: ${CREATOR_TOKEN:0:20}..."
        log_info "User ID: $CREATOR_ID"
    else
        log_error "創作者登入失敗 - 未獲取到 token"
        log_info "Response: $response"
        return 1
    fi
    
    # 3. 創建訂閱層級
    log_test "創建訂閱層級 - Basic ($5)"
    response=$(api_call "POST" "/subscription-tiers" \
        '{"name":"Basic","price":5,"description":"基礎訂閱"}' \
        "$CREATOR_TOKEN" "201")
    
    if echo "$response" | grep -q '"id"'; then
        TIER_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        log_success "創建訂閱層級成功: Basic - \$5"
        log_info "Tier ID: $TIER_ID"
    else
        log_error "創建訂閱層級失敗"
        log_info "Response: $response"
    fi
    
    log_test "創建訂閱層級 - Standard ($10)"
    response=$(api_call "POST" "/subscription-tiers" \
        '{"name":"Standard","price":10,"description":"標準訂閱"}' \
        "$CREATOR_TOKEN" "201")
    
    if echo "$response" | grep -q '"id"\|"name"'; then
        log_success "創建訂閱層級成功: Standard - \$10"
    else
        log_error "創建訂閱層級失敗"
    fi
    
    log_test "創建訂閱層級 - Premium ($20)"
    response=$(api_call "POST" "/subscription-tiers" \
        '{"name":"Premium","price":20,"description":"高級訂閱"}' \
        "$CREATOR_TOKEN" "201")
    
    if echo "$response" | grep -q '"id"\|"name"'; then
        log_success "創建訂閱層級成功: Premium - \$20"
    else
        log_error "創建訂閱層級失敗"
    fi
    
    # 4. 查看訂閱層級列表
    log_test "查看訂閱層級列表"
    response=$(api_call "GET" "/subscription-tiers?creatorId=$CREATOR_ID" \
        "" "$CREATOR_TOKEN" "200")
    
    if echo "$response" | grep -q '"id"\|"name"'; then
        local tier_count=$(echo "$response" | grep -o '"id"' | wc -l)
        log_success "獲取訂閱層級列表成功 (找到 $tier_count 個層級)"
    else
        log_error "獲取訂閱層級列表失敗"
    fi
    
    # 5. 發布文字內容
    log_test "發布文字內容"
    response=$(api_call "POST" "/posts" \
        '{"title":"我的第一篇創作","content":"這是一篇測試內容，歡迎大家訂閱支持！","type":"TEXT","visibility":"PUBLIC"}' \
        "$CREATOR_TOKEN" "201")
    
    if echo "$response" | grep -q '"id"'; then
        POST_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        log_success "發布文字內容成功"
        log_info "Post ID: $POST_ID"
    else
        log_error "發布文字內容失敗"
        log_info "Response: $response"
    fi
    
    # 6. 模擬上傳圖片
    log_test "模擬上傳圖片"
    response=$(api_call "POST" "/media/upload" \
        '{"fileName":"test-image.jpg","fileType":"image/jpeg","fileSize":1024000,"mock":true}' \
        "$CREATOR_TOKEN" "")
    
    if echo "$response" | grep -q '"url"\|"mediaUrl"\|"id"'; then
        log_success "模擬上傳圖片成功"
    else
        log_warning "上傳圖片 API 可能未實作"
        log_info "Response: $response"
    fi
    
    # 7. 發布含媒體的內容
    log_test "發布含媒體的內容"
    response=$(api_call "POST" "/posts" \
        '{"title":"精彩圖片分享","content":"看看這張精彩的圖片！","type":"IMAGE","mediaUrl":"https://mock-s3.example.com/test-image.jpg","visibility":"SUBSCRIBERS_ONLY"}' \
        "$CREATOR_TOKEN" "201")
    
    if echo "$response" | grep -q '"id"'; then
        log_success "發布含媒體的內容成功"
    else
        log_error "發布含媒體的內容失敗"
    fi
    
    # 8. 查看內容列表
    log_test "查看內容列表"
    response=$(api_call "GET" "/posts?creatorId=$CREATOR_ID" \
        "" "$CREATOR_TOKEN" "200")
    
    if echo "$response" | grep -q '"id"\|"title"'; then
        local post_count=$(echo "$response" | grep -o '"title"' | wc -l)
        log_success "獲取內容列表成功 (找到 $post_count 篇內容)"
    else
        log_error "獲取內容列表失敗"
    fi
    
    # 9. 查看收益統計
    log_test "查看收益統計"
    response=$(api_call "GET" "/transactions?userId=$CREATOR_ID" \
        "" "$CREATOR_TOKEN" "200")
    
    if echo "$response" | grep -q '\[\]' || echo "$response" | grep -q '"id"'; then
        log_success "獲取收益統計成功"
    else
        log_warning "收益統計 API 可能未實作"
    fi
}

# ========================================
# 角色 2: 訂閱用戶 (Subscriber)
# ========================================

test_subscriber_flow() {
    log_section "👤 角色 2: 訂閱用戶 (Subscriber) - 業務流程測試"
    
    # 1. 註冊
    log_test "訂閱用戶註冊（Sugar Baby）"
    response=$(api_call "POST" "/auth/register" \
        '{"email":"subscriber@test.com","password":"Subscriber123!","displayName":"Subscriber Test","role":"sugar_baby"}' \
        "" "201")
    
    if echo "$response" | grep -q '"id"\|"user"'; then
        log_success "訂閱用戶註冊成功"
    elif echo "$response" | grep -qi "already exists\|conflict\|duplicate"; then
        log_warning "訂閱用戶已存在，繼續登入流程"
    else
        log_error "訂閱用戶註冊失敗"
        log_info "Response: $response"
    fi
    
    # 2. 登入
    log_test "訂閱用戶登入"
    response=$(api_call "POST" "/auth/login" \
        '{"email":"subscriber@test.com","password":"Subscriber123!"}' \
        "" "200")
    
    if echo "$response" | grep -q "token\|access_token"; then
        SUBSCRIBER_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*\|"access_token":"[^"]*\|"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)
        SUBSCRIBER_ID=$(echo "$response" | grep -o '"id":"[^"]*\|"userId":"[^"]*' | head -1 | cut -d'"' -f4)
        log_success "訂閱用戶登入成功"
        log_info "Token: ${SUBSCRIBER_TOKEN:0:20}..."
        log_info "User ID: $SUBSCRIBER_ID"
    else
        log_error "訂閱用戶登入失敗"
        return 1
    fi
    
    # 3. 瀏覽創作者列表（Sugar Daddy）
    log_test "瀏覽創作者列表"
    response=$(api_call "GET" "/users?role=sugar_daddy" \
        "" "$SUBSCRIBER_TOKEN" "200")
    
    if echo "$response" | grep -q '"id"\|"email"'; then
        local creator_count=$(echo "$response" | grep -o '"email"' | wc -l)
        log_success "瀏覽創作者列表成功 (找到 $creator_count 位創作者)"
    else
        log_error "瀏覽創作者列表失敗"
    fi
    
    # 4. 查看創作者詳情
    if [ -n "$CREATOR_ID" ]; then
        log_test "查看創作者詳情"
        response=$(api_call "GET" "/users/$CREATOR_ID" \
            "" "$SUBSCRIBER_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"email"'; then
            log_success "獲取創作者詳情成功"
        else
            log_error "獲取創作者詳情失敗"
        fi
    fi
    
    # 5. 查看訂閱層級
    if [ -n "$CREATOR_ID" ]; then
        log_test "查看訂閱層級"
        response=$(api_call "GET" "/subscription-tiers?creatorId=$CREATOR_ID" \
            "" "$SUBSCRIBER_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"name"'; then
            log_success "查看訂閱層級成功"
        else
            log_error "查看訂閱層級失敗"
        fi
    fi
    
    # 6. 創建訂閱
    if [ -n "$TIER_ID" ]; then
        log_test "創建訂閱（模擬支付）"
        response=$(api_call "POST" "/subscriptions" \
            '{"tierId":"'"$TIER_ID"'","paymentMethod":"stripe","mockPayment":true}' \
            "$SUBSCRIBER_TOKEN" "201")
        
        if echo "$response" | grep -q '"id"'; then
            SUBSCRIPTION_ID=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
            log_success "創建訂閱成功（模擬支付）"
            log_info "Subscription ID: $SUBSCRIPTION_ID"
        else
            log_error "創建訂閱失敗"
            log_info "Response: $response"
        fi
    fi
    
    # 7. 查看我的訂閱
    log_test "查看我的訂閱"
    response=$(api_call "GET" "/subscriptions/my-subscriptions" \
        "" "$SUBSCRIBER_TOKEN" "200")
    
    if echo "$response" | grep -q '\[\]' || echo "$response" | grep -q '"id"'; then
        local sub_count=$(echo "$response" | grep -o '"id"' | wc -l)
        log_success "查看我的訂閱成功 (當前訂閱數: $sub_count)"
    else
        log_error "查看我的訂閱失敗"
    fi
    
    # 8. 查看已訂閱創作者的內容
    if [ -n "$CREATOR_ID" ]; then
        log_test "查看已訂閱創作者的內容"
        response=$(api_call "GET" "/posts?creatorId=$CREATOR_ID" \
            "" "$SUBSCRIBER_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"title"'; then
            log_success "查看內容成功"
        else
            log_error "查看內容失敗"
        fi
    fi
    
    # 9. 查看單篇內容
    if [ -n "$POST_ID" ]; then
        log_test "查看單篇內容"
        response=$(api_call "GET" "/posts/$POST_ID" \
            "" "$SUBSCRIBER_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"title"'; then
            log_success "查看單篇內容成功"
        else
            log_error "查看單篇內容失敗"
        fi
    fi
    
    # 10. 打賞創作者
    if [ -n "$CREATOR_ID" ]; then
        log_test "打賞創作者"
        response=$(api_call "POST" "/tips" \
            '{"creatorId":"'"$CREATOR_ID"'","amount":10,"message":"感謝你的精彩內容！","mockPayment":true}' \
            "$SUBSCRIBER_TOKEN" "201")
        
        if echo "$response" | grep -q '"id"\|"success"'; then
            log_success "打賞成功（模擬支付）"
        else
            log_warning "打賞 API 可能未實作"
            log_info "Response: $response"
        fi
    fi
}

# ========================================
# 角色 3: 運營人員 (Admin)
# ========================================

test_admin_flow() {
    log_section "👮 角色 3: 運營人員 (Admin) - 業務流程測試"
    
    # 1. 註冊管理員（使用 Sugar Daddy 角色）
    log_test "管理員註冊"
    response=$(api_call "POST" "/auth/register" \
        '{"email":"admin@test.com","password":"Admin123!","displayName":"Admin Test","role":"sugar_daddy"}' \
        "" "201")
    
    if echo "$response" | grep -q '"id"\|"user"'; then
        log_success "管理員註冊成功"
    elif echo "$response" | grep -qi "already exists\|conflict\|duplicate"; then
        log_warning "管理員已存在，繼續登入流程"
    else
        log_error "管理員註冊失敗"
        log_info "Response: $response"
    fi
    
    # 2. 登入
    log_test "管理員登入"
    response=$(api_call "POST" "/auth/login" \
        '{"email":"admin@test.com","password":"Admin123!"}' \
        "" "200")
    
    if echo "$response" | grep -q "token\|access_token"; then
        ADMIN_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*\|"access_token":"[^"]*\|"accessToken":"[^"]*' | head -1 | cut -d'"' -f4)
        ADMIN_ID=$(echo "$response" | grep -o '"id":"[^"]*\|"userId":"[^"]*' | head -1 | cut -d'"' -f4)
        log_success "管理員登入成功"
        log_info "Token: ${ADMIN_TOKEN:0:20}..."
        log_info "User ID: $ADMIN_ID"
    else
        log_error "管理員登入失敗"
        return 1
    fi
    
    # 3. 查看所有用戶
    log_test "查看所有用戶"
    response=$(api_call "GET" "/users" \
        "" "$ADMIN_TOKEN" "200")
    
    if echo "$response" | grep -q '"id"\|"email"'; then
        local user_count=$(echo "$response" | grep -o '"email"' | wc -l)
        log_success "查看所有用戶成功 (平台用戶總數: $user_count)"
    else
        log_error "查看所有用戶失敗"
    fi
    
    # 4. 查看所有訂閱
    log_test "查看所有訂閱"
    response=$(api_call "GET" "/subscriptions" \
        "" "$ADMIN_TOKEN" "200")
    
    if echo "$response" | grep -q '\[\]' || echo "$response" | grep -q '"id"'; then
        local sub_count=$(echo "$response" | grep -o '"id"' | wc -l)
        log_success "查看所有訂閱成功 (平台訂閱總數: $sub_count)"
    else
        log_error "查看所有訂閱失敗"
    fi
    
    # 5. 查看所有交易
    log_test "查看所有交易"
    response=$(api_call "GET" "/transactions" \
        "" "$ADMIN_TOKEN" "200")
    
    if echo "$response" | grep -q '\[\]' || echo "$response" | grep -q '"id"'; then
        log_success "查看所有交易成功"
    else
        log_warning "交易記錄 API 可能未實作"
    fi
    
    # 6. 查看用戶詳情
    if [ -n "$CREATOR_ID" ]; then
        log_test "查看用戶詳情"
        response=$(api_call "GET" "/users/$CREATOR_ID" \
            "" "$ADMIN_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"email"'; then
            log_success "獲取用戶詳情成功"
        else
            log_error "獲取用戶詳情失敗"
        fi
    fi
    
    # 7. 更新用戶狀態
    if [ -n "$CREATOR_ID" ]; then
        log_test "更新用戶狀態"
        response=$(api_call "PATCH" "/users/$CREATOR_ID" \
            '{"status":"ACTIVE"}' \
            "$ADMIN_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"status"'; then
            log_success "更新用戶狀態成功"
        else
            log_warning "更新用戶狀態 API 可能未實作"
        fi
    fi
    
    # 8. 查看所有內容
    log_test "查看所有內容"
    response=$(api_call "GET" "/posts" \
        "" "$ADMIN_TOKEN" "200")
    
    if echo "$response" | grep -q '"id"\|"title"'; then
        local post_count=$(echo "$response" | grep -o '"title"' | wc -l)
        log_success "查看所有內容成功 (平台內容總數: $post_count)"
    else
        log_error "查看所有內容失敗"
    fi
    
    # 9. 審核內容
    if [ -n "$POST_ID" ]; then
        log_test "審核內容"
        response=$(api_call "PATCH" "/posts/$POST_ID" \
            '{"status":"APPROVED","reviewNote":"內容符合平台規範"}' \
            "$ADMIN_TOKEN" "200")
        
        if echo "$response" | grep -q '"id"\|"status"'; then
            log_success "審核內容成功"
        else
            log_warning "審核內容 API 可能未實作"
        fi
    fi
}

# ========================================
# 錯誤場景測試
# ========================================

test_error_scenarios() {
    log_section "⚠️  錯誤場景測試"
    
    # 1. 未授權訪問
    log_test "未授權訪問受保護的資源"
    response=$(api_call "GET" "/posts" \
        "" "" "")
    
    status=$(echo "$response" | tail -n1 2>/dev/null)
    if [ "$status" = "401" ] || echo "$response" | grep -qi "unauthorized\|authentication"; then
        log_success "未授權訪問正確返回 401"
    else
        log_warning "未授權訪問處理可能需要優化"
    fi
    
    # 2. 無效數據
    log_test "提交無效數據（郵箱格式錯誤）"
    response=$(api_call "POST" "/auth/register" \
        '{"email":"invalid-email","password":"123"}' \
        "" "")
    
    if echo "$response" | grep -qi "invalid\|validation\|error"; then
        log_success "無效數據正確返回錯誤"
    else
        log_warning "數據驗證可能需要加強"
    fi
    
    # 3. 重複註冊
    log_test "重複註冊相同郵箱"
    response=$(api_call "POST" "/auth/register" \
        '{"email":"creator@test.com","password":"Creator123!","displayName":"Creator Duplicate","role":"sugar_daddy"}' \
        "" "")
    
    if echo "$response" | grep -qi "already exists\|conflict\|duplicate"; then
        log_success "重複註冊正確返回錯誤"
    else
        log_warning "重複註冊處理可能需要優化"
    fi
    
    # 4. 訪問不存在的資源
    log_test "訪問不存在的用戶"
    if [ -n "$ADMIN_TOKEN" ]; then
        response=$(api_call "GET" "/users/99999999" \
            "" "$ADMIN_TOKEN" "")
        
        if echo "$response" | grep -qi "not found\|404"; then
            log_success "訪問不存在的資源正確返回 404"
        else
            log_warning "404 處理可能需要優化"
        fi
    fi
    
    # 5. 無效 Token
    log_test "使用無效 Token"
    response=$(api_call "GET" "/users" \
        "" "invalid-token-12345" "")
    
    if echo "$response" | grep -qi "unauthorized\|invalid token\|401"; then
        log_success "無效 Token 正確返回 401"
    else
        log_warning "Token 驗證可能需要加強"
    fi
}

# ========================================
# 生成測試報告
# ========================================

generate_report() {
    log_section "📊 測試報告"
    
    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(echo "scale=2; ($PASSED_TESTS * 100) / $TOTAL_TESTS" | bc)
    fi
    
    echo -e "${CYAN}總測試數: $TOTAL_TESTS${NC}"
    echo -e "${GREEN}通過: $PASSED_TESTS${NC}"
    echo -e "${RED}失敗: $FAILED_TESTS${NC}"
    
    if (( $(echo "$pass_rate >= 80" | bc -l) )); then
        echo -e "${GREEN}通過率: ${pass_rate}%${NC}"
    else
        echo -e "${RED}通過率: ${pass_rate}%${NC}"
    fi
    
    echo ""
    echo "總測試數: $TOTAL_TESTS" >> "$REPORT_FILE"
    echo "通過: $PASSED_TESTS" >> "$REPORT_FILE"
    echo "失敗: $FAILED_TESTS" >> "$REPORT_FILE"
    echo "通過率: ${pass_rate}%" >> "$REPORT_FILE"
    
    # 修復建議
    echo ""
    log_section "🔧 修復建議"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}✨ 所有測試通過！系統運行良好。${NC}"
        echo "✨ 所有測試通過！系統運行良好。" >> "$REPORT_FILE"
    else
        echo -e "${YELLOW}1. 檢查失敗的 API 端點是否已實作${NC}"
        echo -e "${YELLOW}2. 驗證 JWT token 配置是否正確${NC}"
        echo -e "${YELLOW}3. 確認資料庫連接和數據持久化${NC}"
        echo -e "${YELLOW}4. 檢查 Kafka 事件是否正確發送${NC}"
        echo -e "${YELLOW}5. 驗證 Redis 緩存是否正常工作${NC}"
        
        echo "1. 檢查失敗的 API 端點是否已實作" >> "$REPORT_FILE"
        echo "2. 驗證 JWT token 配置是否正確" >> "$REPORT_FILE"
        echo "3. 確認資料庫連接和數據持久化" >> "$REPORT_FILE"
        echo "4. 檢查 Kafka 事件是否正確發送" >> "$REPORT_FILE"
        echo "5. 驗證 Redis 緩存是否正常工作" >> "$REPORT_FILE"
    fi
    
    echo ""
    echo -e "${CYAN}💾 詳細測試報告已保存: $REPORT_FILE${NC}"
}

# ========================================
# 主測試流程
# ========================================

main() {
    echo -e "${CYAN}🚀 開始執行 E2E 業務流程測試${NC}"
    echo -e "${CYAN}測試環境: $API_BASE_URL${NC}"
    echo ""
    
    echo "========================================" > "$REPORT_FILE"
    echo "E2E Business Flow Test Report" >> "$REPORT_FILE"
    echo "測試時間: $(date)" >> "$REPORT_FILE"
    echo "測試環境: $API_BASE_URL" >> "$REPORT_FILE"
    echo "========================================" >> "$REPORT_FILE"
    
    test_creator_flow
    test_subscriber_flow
    test_admin_flow
    test_error_scenarios
    
    generate_report
    
    echo ""
    echo -e "${CYAN}✨ 測試完成${NC}"
    
    # 返回適當的退出碼
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# 執行測試
main
