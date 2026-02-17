import { test as setup, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Setup for E2E Tests
 * 
 * 在所有 E2E 測試前執行一次
 */
setup('prepare test environment', async ({ request }) => {
  console.log('🔧 Setting up E2E test environment...');
  
  // 1. 創建必要的目錄
  const projectRoot = process.cwd();
  const dirs = [
    path.join(projectRoot, 'test', 'coverage', 'e2e-report'),
    path.join(projectRoot, 'test', 'coverage', 'e2e-artifacts'),
    path.join(projectRoot, 'test', 'coverage', 'e2e-recordings'),
    path.join(projectRoot, 'logs', 'e2e'),
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✓ Created directory: ${dir}`);
    }
  }
  
  // 2. 檢查環境變數
  const requiredEnvVars = ['E2E_BASE_URL'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.log(`  ⚠️  Missing optional env vars: ${missingVars.join(', ')}`);
    console.log('     Using default: http://localhost:4200');
  }
  
  // 3. 嘗試連接測試服務
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4200';
  console.log(`  ℹ️  Testing connection to ${baseURL}...`);
  
  try {
    const response = await request.get('/login', { timeout: 10000 });
    console.log(`  ✓ Service is accessible (status: ${response.status()})`);
  } catch (error) {
    console.log(`  ⚠️  Could not connect to ${baseURL}`);
    console.log('     Make sure services are running: npm run pm2:start');
    console.log('     Or: bash test/e2e/scripts/setup-e2e-env.sh');
  }
  
  console.log('✅ E2E test environment ready');
});
