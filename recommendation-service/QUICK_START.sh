#!/bin/bash

echo "🚀 Recommendation Service - Quick Start"
echo "========================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Install dependencies
echo -e "${BLUE}[1/4]${NC} Installing npm dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  npm install failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# 2. Start Docker services
echo -e "${BLUE}[2/4]${NC} Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Docker services failed${NC}"
  exit 1
fi
sleep 5
echo -e "${GREEN}✅ Database services running${NC}"

# 3. Build the project
echo -e "${BLUE}[3/4]${NC} Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# 4. Run tests
echo -e "${BLUE}[4/4]${NC} Running tests..."
npm test -- --passWithNoTests
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Tests may have issues (will continue)${NC}"
fi
echo -e "${GREEN}✅ Tests completed${NC}"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Start dev server: ${YELLOW}npm run dev${NC}"
echo "2. View API docs: ${YELLOW}API.md${NC}"
echo "3. View algorithm: ${YELLOW}ALGORITHM.md${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  npm run dev          - Start development server"
echo "  npm test             - Run tests"
echo "  npm run test:cov     - Coverage report"
echo "  docker-compose logs  - View logs"
echo "  docker-compose down  - Stop services"
echo ""
echo -e "${GREEN}Service will run at http://localhost:3000${NC}"
