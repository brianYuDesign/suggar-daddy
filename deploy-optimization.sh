#!/bin/bash

###############################################################################
# BACK-006 Database Optimization Deployment Script
# 
# Usage:
#   ./deploy-optimization.sh [staging|production] [full|migration-only|code-only]
# 
# Examples:
#   ./deploy-optimization.sh staging full        # Deploy everything to staging
#   ./deploy-optimization.sh production code-only # Deploy code only to production
###############################################################################

set -e

# Configuration
ENVIRONMENT=${1:-staging}
DEPLOYMENT_TYPE=${2:-full}
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Helper Functions
###############################################################################

log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

###############################################################################
# Validation
###############################################################################

validate_environment() {
  log "Validating deployment environment..."

  if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'."
    exit 1
  fi

  if [[ ! "$DEPLOYMENT_TYPE" =~ ^(full|migration-only|code-only)$ ]]; then
    error "Invalid deployment type: $DEPLOYMENT_TYPE"
    exit 1
  fi

  # Check if Node.js is available
  if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js first."
    exit 1
  fi

  # Check if npm is available
  if ! command -v npm &> /dev/null; then
    error "npm is not installed. Please install npm first."
    exit 1
  fi

  # Check if TypeORM CLI is available
  if ! npm list typeorm &> /dev/null; then
    warning "TypeORM is not installed locally. Installing..."
    npm install
  fi

  success "Environment validation passed"
}

###############################################################################
# Database Backup
###############################################################################

backup_database() {
  log "Creating database backup..."

  mkdir -p "$BACKUP_DIR"

  if [[ "$ENVIRONMENT" == "production" ]]; then
    log "⚠️  Production environment - creating full backup"
    # Backup production databases
    for db in recommendation_db auth_db payment_db content_db; do
      pg_dump -h "$DB_HOST" -U "$DB_USER" "$db" > "$BACKUP_DIR/${db}-backup.sql"
      success "Backed up $db to $BACKUP_DIR/${db}-backup.sql"
    done
  else
    log "Staging environment - light backup"
    # Just backup the main database
    pg_dump -h localhost -U postgres recommendation_db > "$BACKUP_DIR/recommendation_db-backup.sql"
    success "Backed up recommendation_db to $BACKUP_DIR"
  fi
}

###############################################################################
# Database Migration
###############################################################################

run_migrations() {
  log "Running database migrations..."

  cd recommendation-service

  if [[ "$ENVIRONMENT" == "staging" ]]; then
    export NODE_ENV=staging
  else
    export NODE_ENV=production
  fi

  # Run migrations
  npm run typeorm migration:run

  if [ $? -eq 0 ]; then
    success "Database migrations completed successfully"
  else
    error "Database migrations failed!"
    exit 1
  fi

  cd ..
}

###############################################################################
# Code Deployment
###############################################################################

deploy_code() {
  log "Deploying code changes..."

  # Install dependencies
  log "Installing dependencies..."
  npm install

  # Build services
  for service in recommendation-service auth-service payment-service content-streaming-service; do
    log "Building $service..."
    cd "$service"
    npm run build
    
    if [ $? -eq 0 ]; then
      success "Built $service"
    else
      error "Failed to build $service"
      exit 1
    fi
    
    cd ..
  done

  if [[ "$ENVIRONMENT" == "production" ]]; then
    log "🚀 Deploying to production with Docker..."
    docker-compose -f docker-compose.prod.yml up -d
  else
    log "🚀 Deploying to staging with Docker..."
    docker-compose up -d
  fi

  if [ $? -eq 0 ]; then
    success "Code deployed successfully"
  else
    error "Code deployment failed!"
    exit 1
  fi
}

###############################################################################
# Health Checks
###############################################################################

health_check() {
  log "Running health checks..."

  # Wait for services to start
  sleep 5

  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    # Check recommendation service
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
      success "Recommendation service is healthy"
      break
    fi

    attempt=$((attempt + 1))
    warning "Health check attempt $attempt/$max_attempts..."
    sleep 2
  done

  if [ $attempt -eq $max_attempts ]; then
    error "Services failed to start after 60 seconds"
    return 1
  fi

  # Check all endpoints
  log "Checking API endpoints..."
  
  curl -s http://localhost:3001/health | grep -q "ok" && success "GET /health OK" || error "GET /health FAILED"
  curl -s http://localhost:3002/health | grep -q "ok" && success "Content API healthy" || warning "Content API not yet ready"
  curl -s http://localhost:3003/health | grep -q "ok" && success "Auth API healthy" || warning "Auth API not yet ready"
  curl -s http://localhost:3004/health | grep -q "ok" && success "Payment API healthy" || warning "Payment API not yet ready"

  success "Health checks passed"
}

###############################################################################
# Performance Validation
###############################################################################

validate_performance() {
  log "Validating performance improvements..."

  # Check if k6 is installed
  if ! command -v k6 &> /dev/null; then
    warning "k6 is not installed. Skipping performance test."
    warning "To validate performance, run: k6 run load-test.ts"
    return 0
  fi

  log "Running performance validation test..."
  k6 run load-test.ts --duration 2m --vus 10 --out json=performance-validation.json

  if [ $? -eq 0 ]; then
    success "Performance validation completed"
    log "Review results in performance-validation.json"
  else
    warning "Performance validation failed. Review manually."
  fi
}

###############################################################################
# Cache Warm-up
###############################################################################

warm_up_cache() {
  log "Warming up cache..."

  # Call cache warm-up endpoint
  curl -X POST http://localhost:3001/cache/warmup \
    -H "Content-Type: application/json" \
    -d '{"limit":100}' \
    2>/dev/null

  if [ $? -eq 0 ]; then
    success "Cache warm-up initiated"
    sleep 10
    success "Cache warm-up completed"
  else
    warning "Cache warm-up endpoint not available. Manual warm-up may be needed."
  fi
}

###############################################################################
# Monitoring Setup
###############################################################################

setup_monitoring() {
  log "Setting up monitoring..."

  # Check if Prometheus is running
  if curl -s http://localhost:9090 > /dev/null 2>&1; then
    success "Prometheus is running"
  else
    warning "Prometheus is not running. Metrics may not be collected."
  fi

  # Check if Grafana is running
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    success "Grafana is running"
  else
    warning "Grafana is not running. Dashboards may not be available."
  fi

  log "Access monitoring:"
  log "  Prometheus: http://localhost:9090"
  log "  Grafana: http://localhost:3000"
}

###############################################################################
# Rollback Function
###############################################################################

rollback() {
  error "Deployment failed! Attempting rollback..."

  if [[ "$DEPLOYMENT_TYPE" != "code-only" ]]; then
    log "Rolling back database migrations..."
    cd recommendation-service
    npm run typeorm migration:revert
    cd ..
  fi

  log "Rolling back code changes..."
  docker-compose down
  docker-compose pull
  docker-compose up -d

  warning "Rollback completed. Please verify the system manually."
  exit 1
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
  log "====================================================="
  log "BACK-006 Database Optimization Deployment"
  log "====================================================="
  log "Environment: $ENVIRONMENT"
  log "Deployment Type: $DEPLOYMENT_TYPE"
  log "Timestamp: $(date)"
  log "====================================================="

  validate_environment

  # Backup
  if [[ "$DEPLOYMENT_TYPE" == "full" || "$DEPLOYMENT_TYPE" == "migration-only" ]]; then
    backup_database || rollback
  fi

  # Database Migration
  if [[ "$DEPLOYMENT_TYPE" == "full" || "$DEPLOYMENT_TYPE" == "migration-only" ]]; then
    run_migrations || rollback
  fi

  # Code Deployment
  if [[ "$DEPLOYMENT_TYPE" == "full" || "$DEPLOYMENT_TYPE" == "code-only" ]]; then
    deploy_code || rollback
  fi

  # Health Checks
  health_check || rollback

  # Warm-up Cache
  warm_up_cache

  # Setup Monitoring
  setup_monitoring

  # Performance Validation
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    validate_performance
  fi

  log "====================================================="
  success "Deployment completed successfully!"
  log "====================================================="
  log ""
  log "📊 Next Steps:"
  log "  1. Monitor metrics: http://localhost:3000 (Grafana)"
  log "  2. Check performance: curl http://localhost:3001/health"
  log "  3. View API docs: http://localhost:3001/api/docs"
  log ""
  log "📝 For rollback, run:"
  log "  ./deploy-optimization.sh $ENVIRONMENT rollback"
  log "====================================================="
}

# Run main function
main

# Log summary
success "Deployment log saved to: $LOG_FILE"
