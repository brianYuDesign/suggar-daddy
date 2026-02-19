import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationController } from '../../src/modules/recommendations/recommendation.controller';
import { RecommendationService } from '../../src/services/recommendation.service';
import { RedisService } from '../../src/cache/redis.service';
import { Content, UserInteraction, UserInterest } from '../../src/database/entities';

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
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(Content),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserInteraction),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserInterest),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(0),
            getClient: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    recommendationService = moduleFixture.get<RecommendationService>(
      RecommendationService,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/recommendations/:userId (Happy Path)', () => {
    it('應該返回用戶的推薦列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-123')
        .expect(200);

      expect(response.body).toHaveProperty('user_id');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('應該支持自訂 limit 參數', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-456')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.count).toBeLessThanOrEqual(5);
    });

    it('應該返回有效的推薦結果格式', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-789')
        .expect(200);

      response.body.recommendations.forEach((item: any) => {
        expect(item).toHaveProperty('content_id');
        expect(item).toHaveProperty('score');
        expect(item).toHaveProperty('reason');
        expect(typeof item.score).toBe('number');
        expect(item.score).toBeGreaterThanOrEqual(0);
        expect(item.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('GET /api/v1/recommendations/:userId (Error Cases)', () => {
    it('應該拒絕 limit < 1', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-123')
        .query({ limit: 0 })
        .expect(400); // 預期錯誤
    });

    it('應該拒絕 limit > 100', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-123')
        .query({ limit: 101 })
        .expect(400);
    });

    it('應該處理無效的 limit 格式', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-123')
        .query({ limit: 'invalid' });

      // 應該使用預設值或返回 400
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /api/v1/recommendations/interactions', () => {
    it('應該記錄用戶互動', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/recommendations/interactions')
        .send({
          user_id: 'user-123',
          content_id: 'content-1',
          interaction_type: 'like',
        })
        .expect(204);
    });
  });

  describe('Performance Tests', () => {
    it('應該在 200ms 內返回結果', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/recommendations/user-123')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });
  });
});
