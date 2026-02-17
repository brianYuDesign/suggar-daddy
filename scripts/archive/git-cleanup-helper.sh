#!/bin/bash
# Git 變更整理助手
# 用途：協助執行 10 個有序的 commits
# 使用：./scripts/git-cleanup-helper.sh <commit-number>

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 顯示使用方式
show_usage() {
    echo -e "${BLUE}Git 變更整理助手${NC}"
    echo ""
    echo "使用方式："
    echo "  $0 <command>"
    echo ""
    echo "Commands:"
    echo "  setup       - 執行前置準備（備份、清理）"
    echo "  commit1     - 執行 Commit 1: 角色系統 - 共享庫"
    echo "  commit2     - 執行 Commit 2: 角色系統 - 服務層"
    echo "  commit3     - 執行 Commit 3: OpenTelemetry"
    echo "  commit4     - 執行 Commit 4: E2E 測試框架"
    echo "  commit5     - 執行 Commit 5: 單元測試補充"
    echo "  commit6     - 執行 Commit 6: 認證功能"
    echo "  commit7     - 執行 Commit 7: 社交功能"
    echo "  commit8     - 執行 Commit 8: 前端優化"
    echo "  commit9     - 執行 Commit 9: 後端優化"
    echo "  commit10    - 執行 Commit 10: 環境配置"
    echo "  commit11    - 執行 Commit 11: .gitignore"
    echo "  verify      - 驗證所有變更"
    echo "  status      - 顯示當前狀態"
    echo ""
    echo "範例："
    echo "  $0 setup       # 第一次執行"
    echo "  $0 commit1     # 提交第一個 commit"
    echo "  $0 verify      # 驗證所有測試"
}

# 顯示標題
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# 顯示成功訊息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 顯示錯誤訊息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 顯示警告訊息
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 執行前置準備
setup() {
    print_header "執行前置準備"
    
    # 1. 檢查是否有未提交的變更
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "檢測到未提交的變更"
    else
        print_error "沒有變更需要整理"
        exit 1
    fi
    
    # 2. 備份資料庫
    print_warning "準備備份資料庫..."
    echo "請手動執行: pg_dump -h localhost -U postgres suggar_daddy > backup_$(date +%Y%m%d).sql"
    read -p "資料庫已備份？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "請先備份資料庫"
        exit 1
    fi
    print_success "資料庫備份確認"
    
    # 3. 執行資料庫遷移
    print_warning "準備執行資料庫遷移..."
    read -p "是否執行遷移 scripts/migrations/001_*.sql？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "請手動執行: psql -h localhost -U postgres -d suggar_daddy -f scripts/migrations/001_add_user_type_permission_role.sql"
        read -p "遷移已完成？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "請先完成資料庫遷移"
            exit 1
        fi
        print_success "資料庫遷移完成"
    fi
    
    # 4. 清理臨時檔案
    print_warning "清理測試產物..."
    npm run e2e:clean || true
    print_success "臨時檔案清理完成"
    
    # 5. 更新 .gitignore
    print_warning "更新 .gitignore..."
    if ! grep -q "e2e/.auth/" .gitignore; then
        echo "" >> .gitignore
        echo "# Playwright auth states" >> .gitignore
        echo "e2e/.auth/" >> .gitignore
        print_success ".gitignore 已更新"
    else
        print_success ".gitignore 已包含必要規則"
    fi
    
    # 6. 顯示狀態
    echo ""
    git status --short | head -20
    echo ""
    print_success "前置準備完成！現在可以執行: $0 commit1"
}

# Commit 1: 角色系統 - 共享庫
commit1() {
    print_header "Commit 1: 角色系統 - 共享庫"
    
    # Add 檔案
    git add libs/database/src/entities/user.entity.ts
    git add libs/database/src/entities/match.entity.ts
    git add libs/database/src/entities/index.ts
    git add libs/dto/src/*.dto.ts
    git add libs/dto/src/types.ts
    git add libs/auth/src/decorators/roles.decorator.ts
    git add libs/auth/src/guards/roles.guard.ts
    git add libs/auth/src/strategies/oauth-*.strategy.ts
    git add libs/common/src/constants.ts
    git add libs/common/src/index.ts
    
    # 顯示將要提交的檔案
    echo -e "${YELLOW}將提交以下檔案:${NC}"
    git diff --cached --name-only
    echo ""
    
    read -p "確認提交這些檔案？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        git reset
        print_error "已取消"
        exit 1
    fi
    
    # Commit
    git commit -m "refactor(libs)!: migrate role system to userType + permissionRole

BREAKING CHANGE: User entity role field split into:
- userType: sugar_baby | sugar_daddy (business role)
- permissionRole: subscriber | creator | admin (system permissions)

Database migration required:
See scripts/migrations/001_add_user_type_permission_role.sql

Changes:
- UserEntity: added userType and permissionRole columns
- Added indexes: idx_users_user_type, idx_users_permission_role
- Updated all DTOs: RegisterDto, UserCardDto, UserProfileDto, CreateUserDto
- Updated RolesGuard to check permissionRole
- OAuth strategies now set both userType and permissionRole
- Backward compatible: old 'role' field kept for migration period

Refs: #ROLE_SYSTEM_REFACTORING"
    
    print_success "Commit 1 完成！"
    
    # 執行測試
    print_warning "執行測試..."
    nx test database && nx test dto && nx test auth
    print_success "測試通過！"
    
    print_success "現在可以執行: $0 commit2"
}

# Commit 2: 角色系統 - 服務層
commit2() {
    print_header "Commit 2: 角色系統 - 服務層"
    
    # Add 所有服務檔案（排除 main.ts 和測試）
    git add apps/*/src/app/*.controller.ts
    git add apps/*/src/app/*.service.ts
    git add apps/*/src/app/dto/*.dto.ts
    git reset apps/*/src/main.ts 2>/dev/null || true
    git reset **/*.spec.ts 2>/dev/null || true
    
    echo -e "${YELLOW}將提交約 50 個服務檔案${NC}"
    git diff --cached --stat
    echo ""
    
    read -p "確認提交？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        git reset
        print_error "已取消"
        exit 1
    fi
    
    git commit -m "refactor(services): adapt all services to new role system

Updated 11 microservices to use userType + permissionRole:
- admin-service: all management endpoints updated
- auth-service: register/login flow updated
- user-service: profile endpoints updated
- content-service: post/story/feed controllers
- payment-service: transaction/tip/purchase controllers
- subscription-service: subscription management
- notification-service: permission checks
- messaging-service: DM access control
- matching-service: swipe permission validation
- media-service: upload authorization
- db-writer-service: entity mapping

Key changes:
- @Roles() decorator now checks permissionRole
- RegisterDto now requires userType instead of role
- All user responses include both userType and permissionRole
- Permission checks: admin > creator > subscriber

Part 2/4 of role system migration"
    
    print_success "Commit 2 完成！"
    print_success "現在可以執行: $0 commit3"
}

# 顯示當前狀態
status() {
    print_header "當前狀態"
    
    echo -e "${BLUE}Git 狀態:${NC}"
    git status --short | wc -l | xargs echo "變更檔案數:"
    echo ""
    
    echo -e "${BLUE}最近的 commits:${NC}"
    git log --oneline -5
    echo ""
    
    echo -e "${BLUE}未追蹤的檔案:${NC}"
    git ls-files --others --exclude-standard | wc -l | xargs echo "未追蹤檔案數:"
    echo ""
    
    echo -e "${BLUE}建議的下一步:${NC}"
    # 檢查是否有 commit
    if git log --oneline | grep -q "migrate role system"; then
        echo "✓ Commit 1 已完成"
        if git log --oneline | grep -q "adapt all services"; then
            echo "✓ Commit 2 已完成"
            echo "→ 執行: $0 commit3"
        else
            echo "→ 執行: $0 commit2"
        fi
    else
        echo "→ 執行: $0 setup (如果尚未執行)"
        echo "→ 執行: $0 commit1"
    fi
}

# 驗證所有變更
verify() {
    print_header "驗證所有變更"
    
    print_warning "執行所有測試..."
    npm run ci:check
    print_success "所有測試通過！"
    
    print_warning "執行健康檢查..."
    ./scripts/health-check.sh || print_warning "請確保服務正在運行"
    
    print_success "驗證完成！"
}

# 主程式
main() {
    case "$1" in
        setup)
            setup
            ;;
        commit1)
            commit1
            ;;
        commit2)
            commit2
            ;;
        status)
            status
            ;;
        verify)
            verify
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# 執行主程式
main "$@"
