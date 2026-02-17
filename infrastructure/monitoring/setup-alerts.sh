#!/bin/bash

# =============================================================================
# Suggar Daddy 監控告警部署腳本
# =============================================================================
# 功能：
#   1. 部署告警配置到 Prometheus 和 Alertmanager
#   2. 驗證配置正確性
#   3. 測試告警通知（可選）
#   4. 創建告警靜默規則
#
# 使用方法：
#   ./setup-alerts.sh [command] [options]
#
#   Commands:
#     deploy        - 部署告警配置（默認）
#     validate      - 驗證配置語法
#     test          - 測試告警通知
#     silence       - 創建靜默規則
#     status        - 檢查告警系統狀態
#     reload        - 重新加載配置
#     full-setup    - 執行完整設置
#
#   Options:
#     --env         - 指定環境 (dev|staging|production)，默認 dev
#     --test-slack  - 測試 Slack 通知
#     --test-email  - 測試 Email 通知
#
# 示例：
#   ./setup-alerts.sh deploy --env production
#   ./setup-alerts.sh validate
#   ./setup-alerts.sh test --test-slack
#   ./setup-alerts.sh full-setup --env production
# =============================================================================

set -euo pipefail

# =============================================================================
# 配置變數
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MONITORING_DIR="${SCRIPT_DIR}"

# 默認值
ENV="dev"
TEST_SLACK=false
TEST_EMAIL=false
COMMAND="deploy"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Prometheus & Alertmanager 配置
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"

# =============================================================================
# 日誌函數
# =============================================================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BOLD}========================================${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${BOLD}========================================${NC}\n"
}

# =============================================================================
# 輔助函數
# =============================================================================
show_usage() {
    cat << EOF
Suggar Daddy 監控告警部署腳本

使用方法: $0 [command] [options]

Commands:
    deploy          部署告警配置（默認）
    validate        驗證配置語法
    test            測試告警通知
    silence         創建靜默規則
    status          檢查告警系統狀態
    reload          重新加載配置
    full-setup      執行完整設置（驗證+部署+測試）

Options:
    -e, --env       指定環境 (dev|staging|production)，默認 dev
    -s, --test-slack 測試 Slack 通知
    -m, --test-email 測試 Email 通知
    -h, --help      顯示幫助信息

示例:
    $0 deploy --env production
    $0 validate
    $0 test --test-slack
    $0 full-setup --env production
EOF
}

parse_args() {
    if [[ $# -eq 0 ]]; then
        return
    fi

    # 第一個參數可能是命令
    case "$1" in
        deploy|validate|test|silence|status|reload|full-setup)
            COMMAND="$1"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
    esac

    # 解析剩餘選項
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -e|--env)
                ENV="$2"
                shift 2
                ;;
            -s|--test-slack)
                TEST_SLACK=true
                shift
                ;;
            -m|--test-email)
                TEST_EMAIL=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "未知選項: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

check_dependencies() {
    local deps=("curl" "jq")
    local missing=()

    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少依賴: ${missing[*]}"
        log_info "請安裝: brew install ${missing[*]}"
        exit 1
    fi
}

check_docker() {
    if ! docker info &> /dev/null; then
        log_error "Docker 未運行，請先啟動 Docker"
        exit 1
    fi
    log_success "Docker 運行正常"
}

# =============================================================================
# 驗證函數
# =============================================================================
validate_prometheus_rules() {
    log_section "驗證 Prometheus 告警規則"

    local rules_file="${MONITORING_DIR}/prometheus/alert-rules.yml"
    
    if [[ ! -f "$rules_file" ]]; then
        log_error "告警規則文件不存在: $rules_file"
        return 1
    fi

    log_info "檢查文件語法..."
    
    # 使用 promtool 驗證（如果可用）
    if command -v promtool &> /dev/null; then
        if promtool check rules "$rules_file"; then
            log_success "Prometheus 告警規則語法正確"
        else
            log_error "Prometheus 告警規則語法錯誤"
            return 1
        fi
    else
        log_warn "promtool 未安裝，使用基本 YAML 驗證"
        # 基本 YAML 語法驗證
        if python3 -c "import yaml; yaml.safe_load(open('$rules_file'))" 2>/dev/null; then
            log_success "YAML 語法正確"
        else
            log_error "YAML 語法錯誤"
            return 1
        fi
    fi

    # 統計告警規則數量
    local alert_count
    alert_count=$(grep -c "^  - alert:" "$rules_file" || true)
    log_info "發現 ${alert_count} 條告警規則"

    return 0
}

validate_alertmanager_config() {
    log_section "驗證 Alertmanager 配置"

    local config_file="${MONITORING_DIR}/alertmanager/alertmanager.yml"
    
    if [[ ! -f "$config_file" ]]; then
        log_error "Alertmanager 配置文件不存在: $config_file"
        return 1
    fi

    log_info "檢查文件語法..."

    # 使用 amtool 驗證（如果可用）
    if command -v amtool &> /dev/null; then
        if amtool check-config "$config_file"; then
            log_success "Alertmanager 配置語法正確"
        else
            log_error "Alertmanager 配置語法錯誤"
            return 1
        fi
    else
        log_warn "amtool 未安裝，使用基本 YAML 驗證"
        if python3 -c "import yaml; yaml.safe_load(open('$config_file'))" 2>/dev/null; then
            log_success "YAML 語法正確"
        else
            log_error "YAML 語法錯誤"
            return 1
        fi
    fi

    # 統計接收者數量
    local receiver_count
    receiver_count=$(grep -c "^  - name:" "$config_file" || true)
    log_info "發現 ${receiver_count} 個通知接收者"

    return 0
}

check_environment_variables() {
    log_section "檢查環境變數"

    local required_vars=("SLACK_WEBHOOK_URL")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warn "以下環境變數未設置: ${missing_vars[*]}"
        log_info "請從 .env.alerting.example 創建 .env.alerting 文件並配置"
        
        # 開發環境允許繼續
        if [[ "$ENV" == "production" ]]; then
            log_error "生產環境必須設置所有必需的環境變數"
            return 1
        fi
    else
        log_success "所有必需的環境變數已設置"
    fi

    return 0
}

# =============================================================================
# 部署函數
# =============================================================================
deploy_configs() {
    log_section "部署告警配置"

    # 檢查容器是否運行
    local prometheus_container="suggar-daddy-prometheus"
    local alertmanager_container="suggar-daddy-alertmanager"

    if docker ps --format '{{.Names}}' | grep -q "^${prometheus_container}$"; then
        log_info "複製告警規則到 Prometheus..."
        docker cp "${MONITORING_DIR}/prometheus/alert-rules.yml" "${prometheus_container}:/etc/prometheus/"
        
        log_info "重新加載 Prometheus 配置..."
        if curl -X POST "${PROMETHEUS_URL}/-/reload" 2>/dev/null; then
            log_success "Prometheus 配置已重新加載"
        else
            log_warn "無法重新加載 Prometheus，可能需要手動重啟容器"
        fi
    else
        log_warn "Prometheus 容器未運行，配置將在下次啟動時生效"
    fi

    if docker ps --format '{{.Names}}' | grep -q "^${alertmanager_container}$"; then
        log_info "複製配置到 Alertmanager..."
        
        # 根據環境選擇配置
        local alertmanager_config="${MONITORING_DIR}/alertmanager/alertmanager.yml"
        
        docker cp "$alertmanager_config" "${alertmanager_container}:/etc/alertmanager/"
        
        # 複製模板文件
        if [[ -d "${MONITORING_DIR}/alertmanager/templates" ]]; then
            docker cp "${MONITORING_DIR}/alertmanager/templates/" "${alertmanager_container}:/etc/alertmanager/"
        fi
        
        log_info "重新加載 Alertmanager 配置..."
        if curl -X POST "${ALERTMANAGER_URL}/-/reload" 2>/dev/null; then
            log_success "Alertmanager 配置已重新加載"
        else
            log_warn "無法重新加載 Alertmanager，可能需要手動重啟容器"
        fi
    else
        log_warn "Alertmanager 容器未運行，配置將在下次啟動時生效"
    fi

    log_success "告警配置部署完成"
}

# =============================================================================
# 測試函數
# =============================================================================
test_slack_notification() {
    log_section "測試 Slack 通知"

    local slack_webhook="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -z "$slack_webhook" ]]; then
        log_error "SLACK_WEBHOOK_URL 未設置"
        return 1
    fi

    log_info "發送測試消息到 Slack..."

    local test_payload='{
        "channel": "#alerts",
        "username": "Alertmanager Test",
        "icon_emoji": ":white_check_mark:",
        "text": "這是一條測試消息\n時間: '$(date '+%Y-%m-%d %H:%M:%S')'\n環境: '$ENV'"
    }'

    if curl -s -X POST -H 'Content-type: application/json' \
        --data "$test_payload" \
        "$slack_webhook" | grep -q "ok"; then
        log_success "Slack 測試消息發送成功"
    else
        log_error "Slack 測試消息發送失敗"
        return 1
    fi
}

test_alertmanager_notification() {
    log_section "測試 Alertmanager 告警通知"

    # 發送測試告警到 Alertmanager
    local test_alert='[
        {
            "labels": {
                "alertname": "TestAlert",
                "service": "test-service",
                "severity": "warning",
                "category": "test",
                "instance": "localhost:8080"
            },
            "annotations": {
                "summary": "測試告警",
                "description": "這是一條測試告警消息，時間: '$(date '+%Y-%m-%d %H:%M:%S')'"
            },
            "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
        }
    ]'

    log_info "發送測試告警到 Alertmanager..."
    
    local response
    response=$(curl -s -X POST \
        -H 'Content-Type: application/json' \
        --data "$test_alert" \
        "${ALERTMANAGER_URL}/api/v1/alerts" 2>&1)

    if [[ $? -eq 0 ]]; then
        log_success "測試告警已發送到 Alertmanager"
        log_info "請檢查 Slack 是否收到通知"
        
        # 等待用戶確認
        echo ""
        read -p "是否收到 Slack 通知? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_success "告警通知測試通過"
        else
            log_warn "告警通知可能有問題，請檢查配置"
        fi
    else
        log_error "發送測試告警失敗: $response"
        return 1
    fi
}

# =============================================================================
# 狀態檢查函數
# =============================================================================
check_alert_status() {
    log_section "檢查告警系統狀態"

    # 檢查 Prometheus 告警規則
    log_info "獲取 Prometheus 告警規則狀態..."
    
    local prometheus_rules
    prometheus_rules=$(curl -s "${PROMETHEUS_URL}/api/v1/rules" 2>/dev/null || echo '{}')
    
    if [[ $(echo "$prometheus_rules" | jq -r '.status // "error"') == "success" ]]; then
        log_success "Prometheus 告警規則加載正常"
        
        # 統計活躍告警
        local active_alerts
        active_alerts=$(echo "$prometheus_rules" | jq '[.data.groups[].rules[] | select(.state == "firing")] | length')
        log_info "當前活躍告警數量: $active_alerts"
    else
        log_warn "無法獲取 Prometheus 告警規則狀態"
    fi

    # 檢查 Alertmanager 狀態
    log_info "獲取 Alertmanager 狀態..."
    
    local am_status
    am_status=$(curl -s "${ALERTMANAGER_URL}/api/v2/status" 2>/dev/null || echo '{}')
    
    if [[ -n "$am_status" && "$am_status" != '{}' ]]; then
        log_success "Alertmanager 運行正常"
        
        # 獲取活躍告警
        local active_alerts
        active_alerts=$(curl -s "${ALERTMANAGER_URL}/api/v2/alerts?active=true&silenced=false" 2>/dev/null | jq 'length')
        log_info "Alertmanager 活躍告警數量: ${active_alerts:-0}"
        
        # 獲取靜默規則
        local silences
        silences=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences" 2>/dev/null | jq '[.[] | select(.status.state == "active")] | length')
        log_info "當前靜默規則數量: ${silences:-0}"
    else
        log_warn "無法獲取 Alertmanager 狀態"
    fi
}

# =============================================================================
# 靜默規則函數
# =============================================================================
create_silence() {
    log_section "創建告警靜默規則"

    echo "靜默規則類型:"
    echo "1) 維護窗口 - 靜默所有告警"
    echo "2) 特定服務 - 靜默指定服務的告警"
    echo "3) 特定告警 - 靜默指定的告警名稱"
    echo "4) 取消所有靜默"
    echo "5) 查看當前靜默規則"
    echo

    read -p "請選擇 (1-5): " choice

    case $choice in
        1)
            create_maintenance_silence
            ;;
        2)
            create_service_silence
            ;;
        3)
            create_alertname_silence
            ;;
        4)
            expire_all_silences
            ;;
        5)
            list_silences
            ;;
        *)
            log_warn "無效選擇"
            ;;
    esac
}

create_maintenance_silence() {
    read -p "維護時長（分鐘，默認 60）: " duration
    duration=${duration:-60}

    local starts_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local ends_at=$(date -u -d "+${duration} minutes" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+${duration}M +%Y-%m-%dT%H:%M:%SZ)

    local silence_payload='{
        "matchers": [
            {"name": "severity", "value": ".*", "isRegex": true}
        ],
        "startsAt": "'"$starts_at"'",
        "endsAt": "'"$ends_at"'",
        "createdBy": "setup-alerts.sh",
        "comment": "維護窗口 - 手動創建"
    }'

    local response
    response=$(curl -s -X POST \
        -H 'Content-Type: application/json' \
        --data "$silence_payload" \
        "${ALERTMANAGER_URL}/api/v2/silences")

    if echo "$response" | jq -e '.silenceID' &>/dev/null; then
        log_success "維護窗口靜默規則已創建 (ID: $(echo "$response" | jq -r '.silenceID'))"
        log_info "將在 ${duration} 分鐘後自動過期"
    else
        log_error "創建靜默規則失敗"
    fi
}

create_service_silence() {
    read -p "服務名稱（如 auth-service）: " service_name
    read -p "靜默時長（分鐘，默認 30）: " duration
    duration=${duration:-30}

    local starts_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local ends_at=$(date -u -d "+${duration} minutes" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+${duration}M +%Y-%m-%dT%H:%M:%SZ)

    local silence_payload='{
        "matchers": [
            {"name": "service", "value": "'"$service_name"'", "isRegex": false}
        ],
        "startsAt": "'"$starts_at"'",
        "endsAt": "'"$ends_at"'",
        "createdBy": "setup-alerts.sh",
        "comment": "服務維護 - '"$service_name"'"
    }'

    local response
    response=$(curl -s -X POST \
        -H 'Content-Type: application/json' \
        --data "$silence_payload" \
        "${ALERTMANAGER_URL}/api/v2/silences")

    if echo "$response" | jq -e '.silenceID' &>/dev/null; then
        log_success "服務靜默規則已創建"
    else
        log_error "創建靜默規則失敗"
    fi
}

create_alertname_silence() {
    read -p "告警名稱（如 HighMemoryUsage）: " alert_name
    read -p "靜默時長（分鐘，默認 30）: " duration
    duration=${duration:-30}

    local starts_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local ends_at=$(date -u -d "+${duration} minutes" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+${duration}M +%Y-%m-%dT%H:%M:%SZ)

    local silence_payload='{
        "matchers": [
            {"name": "alertname", "value": "'"$alert_name"'", "isRegex": false}
        ],
        "startsAt": "'"$starts_at"'",
        "endsAt": "'"$ends_at"'",
        "createdBy": "setup-alerts.sh",
        "comment": "告警靜默 - '"$alert_name"'"
    }'

    local response
    response=$(curl -s -X POST \
        -H 'Content-Type: application/json' \
        --data "$silence_payload" \
        "${ALERTMANAGER_URL}/api/v2/silences")

    if echo "$response" | jq -e '.silenceID' &>/dev/null; then
        log_success "告警靜默規則已創建"
    else
        log_error "創建靜默規則失敗"
    fi
}

expire_all_silences() {
    log_warn "這將過期所有活躍的靜默規則"
    read -p "確認? (yes/no): " confirm

    if [[ "$confirm" == "yes" ]]; then
        local silences
        silences=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences" | jq -r '.[] | select(.status.state == "active") | .id')

        for id in $silences; do
            curl -s -X DELETE "${ALERTMANAGER_URL}/api/v2/silence/${id}"
        done

        log_success "所有靜默規則已過期"
    fi
}

list_silences() {
    log_info "當前活躍的靜默規則:"
    
    local silences
    silences=$(curl -s "${ALERTMANAGER_URL}/api/v2/silences")

    echo "$silences" | jq -r '.[] | select(.status.state == "active") | 
        "ID: \(.id)\n" +
        "  Comment: \(.comment)\n" +
        "  Matchers: \(.matchers | map("\(.name)=\(.value)") | join(", "))\n" +
        "  Ends At: \(.endsAt)\n" +
        "  ---"'
}

# =============================================================================
# 主函數
# =============================================================================
main() {
    parse_args "$@"
    
    log_section "Suggar Daddy 監控告警部署腳本"
    log_info "命令: $COMMAND"
    log_info "環境: $ENV"

    # 檢查依賴
    check_dependencies

    case "$COMMAND" in
        validate)
            validate_prometheus_rules
            validate_alertmanager_config
            ;;
        
        deploy)
            check_environment_variables
            validate_prometheus_rules
            validate_alertmanager_config
            deploy_configs
            ;;
        
        test)
            if $TEST_SLACK; then
                test_slack_notification
            fi
            test_alertmanager_notification
            ;;
        
        silence)
            create_silence
            ;;
        
        status)
            check_alert_status
            ;;
        
        reload)
            deploy_configs
            ;;
        
        full-setup)
            check_docker
            check_environment_variables
            validate_prometheus_rules
            validate_alertmanager_config
            deploy_configs
            sleep 5
            check_alert_status
            
            read -p "是否測試告警通知? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                test_alertmanager_notification
            fi
            
            log_section "完整設置完成"
            log_success "告警系統已成功配置"
            ;;
        
        *)
            log_error "未知命令: $COMMAND"
            show_usage
            exit 1
            ;;
    esac
}

# 運行主函數
main "$@"
