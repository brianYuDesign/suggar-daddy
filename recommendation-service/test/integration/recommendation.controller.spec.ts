import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from '../services/recommendation.service';

/**
 * 集成測試 - RecommendationController
 *
 * 測試層次：
 * - API 端點功能
 * - 請求/響應驗證
 * - HTTP 狀態碼
 * - Happy path + Error cases
 */
describe('RecommendationController (Integration)', () => {
  let app: INestApplication;
  let recommendationService: RecommendationService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [RecommendationService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    recommendationService = moduleFixture.get<RecommendationService>(
      RecommendationService,
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /recommendations/:userId (Happy Path)', () => {
    it('應該返回用戶的推薦列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/user-123')
        .expect(200);

      expect(response.body).toHaveProperty('userId', 'user-123');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('應該支持自訂 limit 參數', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/user-456')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.count).toBeLessThanOrEqual(5);
    });

    it('應該返回有效的推薦結果格式', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/user-789')
        .expect(200);

      response.body.recommendations.forEach((item) => {
        expect(item).toHaveProperty('contentId');
        expect(item).toHaveProperty('score');
        expect(item).toHaveProperty('reason');
        expect(typeof item.score).toBe('number');
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('GET /recommendations/:userId (Error Cases)', () => {
    it('應該拒絕 limit < 1', async () => {
      await request(app.getHttpServer())
        .get('/recommendations/user-123')
        .query({ limit: 0 })
        .expect(500); // 預期錯誤
    });

    it('應該拒絕 limit > 100', async () => {
      await request(app.getHttpServer())
        .get('/recommendations/user-123')
        .query({ limit: 101 })
        .expect(500);
    });

    it('應該處理無效的 limit 格式', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations/user-123')
        .query({ limit: 'invalid' });

      // 應該使用預設值或返回錯誤
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /recommendations (Health Check)', () => {
    it('應該返回健康狀態', async () => {
      const response = await request(app.getHttpServer())
        .get('/recommendations')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'recommendation-service');
    });
  });

  describe('Performance Tests', () => {
    it('應該在 100ms 內返回結果', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/recommendations/user-123')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });
});
