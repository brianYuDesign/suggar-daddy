/**
 * Global Setup for Integration Tests
 * 
 * 在所有整合測試執行前運行
 * 確保測試環境（Docker services）已啟動並就緒
 */
export default async function globalSetup() {
  console.log('\n🔧 Setting up integration test environment...\n');
  
  // 設置測試環境變數
  process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.NODE_ENV = 'test';
  
  // 設置資料庫連線資訊
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5434';
  process.env.DB_USERNAME = 'test_user';
  process.env.DB_PASSWORD = 'test_password';
  process.env.DB_DATABASE = 'suggar_daddy_test';
  
  // 設置 Redis 連線資訊
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6382';
  
  // 設置 Kafka 連線資訊
  process.env.KAFKA_BROKERS = 'localhost:9095';
  
  console.log('✅ Integration test environment ready\n');
}
