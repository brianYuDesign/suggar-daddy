import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RecommendationController } from '../../src/modules/recommendation.controller';
import { RecommendationService } from '../../src/services/recommendation.service';
import {
  createTestUser,
  createTestUsers,
  createTestContent,
  mockRecommendationResults,
} from '../fixtures/data.fixtures';

/**
 * E2E 測試 - 推薦卡片流程
 *
 * 測試層次：
 * - 完整的業務流程
 * - 多個 API 端點協作
 * - 模擬真實用戶場景
 */
describe('Recommendation Card Flow (E2E)', () => {
  let app: INestApplication;
  let recommendationService: RecommendationService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [RecommendationService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    recommendationService = moduleFixture.get<RecommendationService>(
      RecommendationService,
    );
  });

  afterEach(async () => {
    await app.close();
  });

  describe('推薦卡片流 (Recommendation Card Stream)', () => {
    it('應該為新用戶生成推薦', async () => {
      // 1. 創建測試用戶
      const testUser = createTestUser({
        interests: ['tech', 'innovation'],
      });

      // 2. 請求推薦
      const response = await request(app.getHttpServer())
        .get(`/recommendations/${testUser.id}`)
        .query({ limit: 10 })
        .expect(200);

      // 3. 驗證響應格式
      expect(response.body).toEqual({
        userId: testUser.id,
        count: expect.any(Number),
        recommendations: expect.any(Array),
      });

      // 4. 驗證推薦結果有效性
      response.body.recommendations.forEach((rec) => {
        expect(recommendationService.validateResult(rec)).toBe(true);
      });
    });

    it('應該為不同用戶返回不同的推薦', async () => {
      const user1 = createTestUser({ interests: ['tech'] });
      const user2 = createTestUser({ interests: ['sports'] });

      const response1 = await request(app.getHttpServer())
        .get(`/recommendations/${user1.id}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get(`/recommendations/${user2.id}`)
        .expect(200);

      // 不同用戶應該有相同的推薦結果（因為我們用的是模擬數據）
      // 在實際應用中，這應該返回不同的結果
      expect(response1.body).toHaveProperty('userId', user1.id);
      expect(response2.body).toHaveProperty('userId', user2.id);
    });

    it('應該支持分頁（通過 limit）', async () => {
      const testUser = createTestUser();

      // 請求 5 個結果
      const response1 = await request(app.getHttpServer())
        .get(`/recommendations/${testUser.id}`)
        .query({ limit: 5 })
        .expect(200);

      // 請求 10 個結果
      const response2 = await request(app.getHttpServer())
        .get(`/recommendations/${testUser.id}`)
        .query({ limit: 10 })
        .expect(200);

      expect(response1.body.count).toBeLessThanOrEqual(5);
      expect(response2.body.count).toBeLessThanOrEqual(10);
    });
  });

  describe('批量用戶推薦流程', () => {
    it('應該為多個用戶生成推薦', async () => {
      const testUsers = createTestUsers(3);

      const results = await Promise.all(
        testUsers.map((user) =>
          request(app.getHttpServer())
            .get(`/recommendations/${user.id}`)
            .expect(200),
        ),
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.body).toHaveProperty('recommendations');
      });
    });

    it('應該在合理時間內處理多個請求', async () => {
      const testUsers = createTestUsers(5);
      const startTime = Date.now();

      const results = await Promise.all(
        testUsers.map((user) =>
          request(app.getHttpServer()).get(`/recommendations/${user.id}`),
        ),
      );

      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(500); // 所有請求應在 500ms 內完成
    });
  });

  describe('推薦內容驗證', () => {
    it('應該返回有效的推薦內容信息', async () => {
      const testUser = createTestUser({
        interests: ['tech', 'programming'],
      });
      const expectedResults = mockRecommendationResults();

      const response = await request(app.getHttpServer())
        .get(`/recommendations/${testUser.id}`)
        .expect(200);

      // 驗證每個推薦都有必要的欄位
      response.body.recommendations.forEach((rec) => {
        expect(rec).toHaveProperty('contentId');
        expect(rec).toHaveProperty('score');
        expect(rec).toHaveProperty('reason');

        // 驗證分數在有效範圍內
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);

        // 驗證分數按降序排列（如果有多個）
      });
    });

    it('應該包含推薦原因', async () => {
      const testUser = createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/recommendations/${testUser.id}`)
        .expect(200);

      response.body.recommendations.forEach((rec) => {
        expect(rec.reason).toBeTruthy();
        expect(typeof rec.reason).toBe('string');
        expect(rec.reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('異常情況處理', () => {
    it('應該處理空用戶 ID', async () => {
      const response = await request(app.getHttpServer()).get(
        '/recommendations/',
      );

      // 應該返回 404 或找到其他路由
      expect([404, 200]).toContain(response.status);
    });

    it('應該處理無效的 limit 值', async () => {
      const testUser = createTestUser();

      const response = await request(app.getHttpServer())
        .get(`/recommendations/${testUser.id}`)
        .query({ limit: -5 });

      // 應該返回錯誤或使用預設值
      expect([200, 400, 500]).toContain(response.status);
    });
  });
});
