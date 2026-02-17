/**
 * Test Server Manager
 * 
 * 管理測試用的 NestJS 應用實例
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

export class TestServer {
  private app: INestApplication | null = null;
  
  /**
   * 創建並啟動測試伺服器
   */
  async start(AppModule: any, port?: number): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    this.app = moduleFixture.createNestApplication();
    
    // 應用全局配置
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    
    if (port) {
      await this.app.listen(port);
    } else {
      await this.app.init();
    }
    
    return this.app;
  }
  
  /**
   * 停止測試伺服器
   */
  async stop(): Promise<void> {
    if (this.app) {
      await this.app.close();
      this.app = null;
    }
  }
  
  /**
   * 獲取應用實例
   */
  getApp(): INestApplication {
    if (!this.app) {
      throw new Error('Test server not started');
    }
    return this.app;
  }
  
  /**
   * 獲取 HTTP server (for supertest)
   */
  getHttpServer(): any {
    return this.getApp().getHttpServer();
  }
}

/**
 * 創建測試伺服器的輔助函數
 */
export async function createTestServer(
  AppModule: any,
  port?: number
): Promise<TestServer> {
  const server = new TestServer();
  await server.start(AppModule, port);
  return server;
}
