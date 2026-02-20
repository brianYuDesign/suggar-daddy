#!/bin/bash
# QA-003: Complete System Integration Testing Executor
# This script orchestrates all testing phases for system deployment readiness

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKSPACE="/Users/brianyu/.openclaw/workspace"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_RESULTS_DIR="${WORKSPACE}/test-results/${TIMESTAMP}"
LOG_FILE="${TEST_RESULTS_DIR}/qa-003-execution.log"

# Services URLs
AUTH_URL="http://localhost:3002"
CONTENT_URL="http://localhost:3001"
RECOMMENDATION_URL="http://localhost:3000"
PAYMENT_URL="http://localhost:3003"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Create results directory
mkdir -p "${TEST_RESULTS_DIR}"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

print_header() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  log ">>> $1"
}

print_subheader() {
  echo ""
  echo -e "${YELLOW}--- $1 ---${NC}"
  log "--- $1"
}

test_case() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  local test_name="$1"
  local test_cmd="$2"
  
  echo -n "Test $TOTAL_TESTS: $test_name ... "
  
  if eval "$test_cmd" >> "${LOG_FILE}" 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
}

check_service() {
  local service_name="$1"
  local url="$2"
  
  if curl -s -f "$url/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} $service_name is running"
    return 0
  else
    echo -e "${RED}❌${NC} $service_name is NOT running at $url"
    return 1
  fi
}

generate_test_user() {
  local unique_id=$(date +%s%N)
  echo "{\"email\":\"test_${unique_id}@example.com\",\"password\":\"TestPassword123!\",\"name\":\"Test User ${unique_id}\"}"
}

# ============================================================================
# PHASE 0: ENVIRONMENT VALIDATION
# ============================================================================

validate_environment() {
  print_header "PHASE 0: Environment Validation"
  
  echo "Checking required services..."
  
  local all_healthy=true
  
  check_service "Auth Service" "$AUTH_URL" || all_healthy=false
  check_service "Content Service" "$CONTENT_URL" || all_healthy=false
  check_service "Recommendation Service" "$RECOMMENDATION_URL" || all_healthy=false
  check_service "Payment Service" "$PAYMENT_URL" || all_healthy=false
  
  if [ "$all_healthy" = false ]; then
    echo ""
    echo -e "${RED}❌ Some services are not running. Please start Docker containers first:${NC}"
    echo "  cd ${WORKSPACE}"
    echo "  docker-compose up -d"
    exit 1
  fi
  
  echo ""
  echo -e "${GREEN}✅ All required services are running${NC}"
}

# ============================================================================
# PHASE 1: BUSINESS SCENARIO TESTS
# ============================================================================

test_user_registration() {
  print_subheader "Test 1.1: User Registration Flow"
  
  local test_user=$(generate_test_user)
  
  test_case "Valid email registration" \
    "curl -s -X POST $AUTH_URL/api/auth/register \
      -H 'Content-Type: application/json' \
      -d '$test_user' | grep -q 'userId'"
  
  test_case "Duplicate email rejection" \
    "curl -s -X POST $AUTH_URL/api/auth/register \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"existing@example.com\",\"password\":\"Pass123!\",\"name\":\"Test\"}' | grep -q 'already'"
  
  test_case "Weak password rejection" \
    "curl -s -X POST $AUTH_URL/api/auth/register \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"new@example.com\",\"password\":\"123\",\"name\":\"Test\"}' | grep -q 'password'"
  
  echo "✓ User registration tests completed"
}

test_user_login() {
  print_subheader "Test 1.2: User Login Flow"
  
  test_case "Valid credentials login" \
    "curl -s -X POST $AUTH_URL/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"testuser@example.com\",\"password\":\"TestPassword123!\"}' | grep -q 'accessToken'"
  
  test_case "Invalid password rejection" \
    "curl -s -X POST $AUTH_URL/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"testuser@example.com\",\"password\":\"WrongPassword\"}' | grep -q 'Unauthorized'"
  
  test_case "Non-existent user rejection" \
    "curl -s -X POST $AUTH_URL/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"nonexistent@example.com\",\"password\":\"Password123\"}' | grep -q 'Unauthorized'"
  
  echo "✓ User login tests completed"
}

test_recommendations() {
  print_subheader "Test 1.3: Recommendation System"
  
  # First login to get token
  local token=$(curl -s -X POST $AUTH_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"testuser@example.com","password":"TestPassword123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$token" ]; then
    test_case "Recommendations loading" \
      "curl -s -X GET $RECOMMENDATION_URL/api/recommendations \
        -H 'Authorization: Bearer $token' | grep -q 'recommendations'"
    
    test_case "Response time < 500ms" \
      "time=$(curl -w '%{time_total}' -s -o /dev/null $RECOMMENDATION_URL/api/recommendations \
        -H 'Authorization: Bearer $token'); [ \$(echo \"$time < 0.5\" | bc) -eq 1 ]"
  fi
  
  echo "✓ Recommendation tests completed"
}

test_content_operations() {
  print_subheader "Test 1.4: Content Service Operations"
  
  local token=$(curl -s -X POST $AUTH_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"testuser@example.com","password":"TestPassword123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$token" ]; then
    test_case "Featured content loading" \
      "curl -s -X GET $CONTENT_URL/api/content/featured \
        -H 'Authorization: Bearer $token' | grep -q 'content'"
  fi
  
  echo "✓ Content operations tests completed"
}

test_payment_flow() {
  print_subheader "Test 1.5: Payment Flow"
  
  local token=$(curl -s -X POST $AUTH_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"testuser@example.com","password":"TestPassword123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$token" ]; then
    test_case "Subscription plans loading" \
      "curl -s -X GET $PAYMENT_URL/api/subscriptions/plans \
        -H 'Authorization: Bearer $token' | grep -q 'plans'"
    
    test_case "Subscription status retrieval" \
      "curl -s -X GET $PAYMENT_URL/api/subscriptions/status \
        -H 'Authorization: Bearer $token' | grep -q 'status'"
  fi
  
  echo "✓ Payment flow tests completed"
}

run_business_scenario_tests() {
  print_header "PHASE 1: Business Scenario Tests"
  
  test_user_registration
  test_user_login
  test_recommendations
  test_content_operations
  test_payment_flow
}

# ============================================================================
# PHASE 2: PERFORMANCE TESTS
# ============================================================================

run_performance_tests() {
  print_header "PHASE 2: Performance Tests"
  
  print_subheader "Test 2.1: API Response Time Benchmarks"
  
  local token=$(curl -s -X POST $AUTH_URL/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"testuser@example.com","password":"TestPassword123!"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  
  if [ -n "$token" ]; then
    # Test login API
    local login_time=$(curl -w '%{time_total}' -s -o /dev/null -X POST $AUTH_URL/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"testuser@example.com","password":"TestPassword123!"}')
    
    test_case "Login API < 100ms" "[ \$(echo \"$login_time < 0.1\" | bc) -eq 1 ]"
    
    # Test recommendations API
    local rec_time=$(curl -w '%{time_total}' -s -o /dev/null $RECOMMENDATION_URL/api/recommendations \
      -H "Authorization: Bearer $token")
    
    test_case "Recommendations API < 200ms" "[ \$(echo \"$rec_time < 0.2\" | bc) -eq 1 ]"
    
    echo "  Login time: ${login_time}s"
    echo "  Recommendations time: ${rec_time}s"
  fi
  
  print_subheader "Test 2.2: Load Test (Concurrent Users)"
  
  if command -v k6 &> /dev/null; then
    test_case "K6 load test execution" \
      "k6 run ${WORKSPACE}/performance-tests/k6-load-test.js \
        --vus=10 --duration=30s --summary-export=${TEST_RESULTS_DIR}/load-test-results.json"
    
    echo "📊 Load test results saved to ${TEST_RESULTS_DIR}/load-test-results.json"
  else
    echo -e "${YELLOW}⚠️  K6 not installed. Skipping load test.${NC}"
    echo "    Install with: brew install k6"
  fi
}

# ============================================================================
# PHASE 3: SECURITY TESTS
# ============================================================================

run_security_tests() {
  print_header "PHASE 3: Security Tests"
  
  print_subheader "Test 3.1: Authentication Boundary"
  
  test_case "Invalid token rejection" \
    "curl -s -X GET $RECOMMENDATION_URL/api/recommendations \
      -H 'Authorization: Bearer invalid_token' | grep -q 'Unauthorized'"
  
  test_case "Empty token rejection" \
    "curl -s -X GET $RECOMMENDATION_URL/api/recommendations \
      -H 'Authorization: Bearer' | grep -q 'Unauthorized' || grep -q '401'"
  
  print_subheader "Test 3.2: Authorization & Permissions"
  
  test_case "Permission denied for unauthorized operations" \
    "curl -s -X POST $CONTENT_URL/api/content/upload \
      -H 'Content-Type: application/json' | grep -q 'Unauthorized'"
  
  print_subheader "Test 3.3: SQL Injection Protection"
  
  test_case "SQL injection in login blocked" \
    "curl -s -X POST $AUTH_URL/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{\"email\":\"admin' OR '1'='1\",\"password\":\"anything\"}' | grep -q 'Unauthorized'"
  
  test_case "Special characters handled safely" \
    "curl -s -X GET $CONTENT_URL/api/content/search?q=%27%20OR%20%271%27%3D%271 \
      | grep -q '200\|400'"
  
  print_subheader "Test 3.4: CORS Configuration"
  
  test_case "CORS headers present" \
    "curl -s -I -X OPTIONS $RECOMMENDATION_URL/api/recommendations | grep -q 'Access-Control'"
}

# ============================================================================
# PHASE 4: DEPLOYMENT READINESS
# ============================================================================

run_deployment_checks() {
  print_header "PHASE 4: Deployment Readiness Checks"
  
  print_subheader "Test 4.1: Code Quality"
  
  # Check if TypeScript compilation works (if in project)
  if [ -f "${WORKSPACE}/tsconfig.json" ]; then
    test_case "TypeScript compilation" \
      "cd ${WORKSPACE} && npm run build 2>&1 | tail -1 | grep -q 'successfully'"
  fi
  
  print_subheader "Test 4.2: Infrastructure Checks"
  
  test_case "Database connectivity" \
    "psql -c 'SELECT 1' > /dev/null 2>&1"
  
  test_case "Redis connectivity" \
    "redis-cli ping | grep -q 'PONG'"
  
  print_subheader "Test 4.3: Health Checks"
  
  test_case "All services healthy" \
    "curl -s $AUTH_URL/health && curl -s $CONTENT_URL/health && curl -s $RECOMMENDATION_URL/health && curl -s $PAYMENT_URL/health"
}

# ============================================================================
# REPORTING AND SUMMARY
# ============================================================================

generate_summary() {
  print_header "TEST EXECUTION SUMMARY"
  
  local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  
  echo ""
  echo "📊 Overall Results:"
  echo "  Total Tests:  $TOTAL_TESTS"
  echo -e "  Passed:       ${GREEN}$PASSED_TESTS${NC}"
  echo -e "  Failed:       ${RED}$FAILED_TESTS${NC}"
  echo "  Success Rate: ${success_rate}%"
  echo ""
  
  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! System is ready for deployment.${NC}"
    return 0
  else
    echo -e "${RED}❌ Some tests failed. Please review the logs.${NC}"
    return 1
  fi
}

generate_html_report() {
  local report_file="${TEST_RESULTS_DIR}/qa-003-report.html"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>QA-003 System Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .passed { color: green; font-weight: bold; }
        .failed { color: red; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>QA-003: Full System Integration Testing Report</h1>
    <p>Generated: $timestamp</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: $TOTAL_TESTS</p>
        <p><span class="passed">Passed: $PASSED_TESTS</span></p>
        <p><span class="failed">Failed: $FAILED_TESTS</span></p>
        <p>Success Rate: $(($PASSED_TESTS * 100 / $TOTAL_TESTS))%</p>
    </div>
    
    <h2>Detailed Results</h2>
    <p>See execution log: qa-003-execution.log</p>
</body>
</html>
EOF
  
  echo "📄 HTML report generated: $report_file"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  echo -e "${GREEN}"
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║                                                        ║"
  echo "║  QA-003: Full System Integration Testing              ║"
  echo "║  Sugar-Daddy Phase 1 Week 3                            ║"
  echo "║                                                        ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  log "QA-003 Test Execution Started"
  log "Timestamp: $TIMESTAMP"
  log "Results Directory: $TEST_RESULTS_DIR"
  
  # Run all testing phases
  validate_environment
  run_business_scenario_tests
  run_performance_tests
  run_security_tests
  run_deployment_checks
  
  # Generate reports
  generate_summary
  generate_html_report
  
  log "QA-003 Test Execution Completed"
  
  echo ""
  echo "📁 Results saved to: $TEST_RESULTS_DIR"
  echo "📊 Log file: $LOG_FILE"
  
  # Exit with appropriate code
  if [ $FAILED_TESTS -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
}

# Run main function
main "$@"
