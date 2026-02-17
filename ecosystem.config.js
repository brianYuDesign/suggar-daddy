/**
 * PM2 Ecosystem Configuration for E2E Testing
 * 
 * This configuration manages all backend services and frontend applications
 * for local development and E2E testing.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop all
 *   pm2 restart all
 *   pm2 logs
 *   pm2 status
 */

const path = require('path');

const PROJECT_ROOT = __dirname;
const LOG_DIR = path.join(PROJECT_ROOT, 'logs', 'pm2');

module.exports = {
  apps: [
    // ==========================================
    // Backend Services (NestJS)
    // ==========================================
    {
      name: 'api-gateway',
      script: 'npx',
      args: 'nx serve api-gateway',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'api-gateway-error.log'),
      out_file: path.join(LOG_DIR, 'api-gateway-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
    {
      name: 'auth-service',
      script: 'npx',
      args: 'nx serve auth-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'auth-service-error.log'),
      out_file: path.join(LOG_DIR, 'auth-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },
    },
    {
      name: 'user-service',
      script: 'npx',
      args: 'nx serve user-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'user-service-error.log'),
      out_file: path.join(LOG_DIR, 'user-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
    {
      name: 'payment-service',
      script: 'npx',
      args: 'nx serve payment-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'payment-service-error.log'),
      out_file: path.join(LOG_DIR, 'payment-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3007,
      },
    },
    {
      name: 'subscription-service',
      script: 'npx',
      args: 'nx serve subscription-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'subscription-service-error.log'),
      out_file: path.join(LOG_DIR, 'subscription-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3005,
      },
    },
    {
      name: 'content-service',
      script: 'npx',
      args: 'nx serve content-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'content-service-error.log'),
      out_file: path.join(LOG_DIR, 'content-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3006,
      },
    },
    {
      name: 'media-service',
      script: 'npx',
      args: 'nx serve media-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'media-service-error.log'),
      out_file: path.join(LOG_DIR, 'media-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 3008,
      },
    },
    {
      name: 'db-writer-service',
      script: 'npx',
      args: 'nx serve db-writer-service',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '500M',
      error_file: path.join(LOG_DIR, 'db-writer-service-error.log'),
      out_file: path.join(LOG_DIR, 'db-writer-service-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
      },
    },

    // ==========================================
    // Frontend Applications (Next.js)
    // ==========================================
    {
      name: 'web',
      script: 'npx',
      args: 'nx serve web',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '1G',
      error_file: path.join(LOG_DIR, 'web-error.log'),
      out_file: path.join(LOG_DIR, 'web-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 4200,
      },
    },
    {
      name: 'admin',
      script: 'npx',
      args: 'nx serve admin',
      cwd: PROJECT_ROOT,
      watch: false,
      max_memory_restart: '1G',
      error_file: path.join(LOG_DIR, 'admin-error.log'),
      out_file: path.join(LOG_DIR, 'admin-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        NODE_ENV: 'development',
        PORT: 4300,
      },
    },
  ],
};
