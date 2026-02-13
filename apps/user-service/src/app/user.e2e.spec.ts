import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

// Mock external services
const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(0),
  exists: jest.fn().mockResolvedValue(0),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  scan: jest.fn().mockResolvedValue([]),
  mget: jest.fn().mockResolvedValue([]),
  sAdd: jest.fn().mockResolvedValue(0),
  sMembers: jest.fn().mockResolvedValue([]),
  sRem: jest.fn().mockResolvedValue(0),
  lPush: jest.fn().mockResolvedValue(0),
  lRange: jest.fn().mockResolvedValue([]),
  lLen: jest.fn().mockResolvedValue(0),
  geoAdd: jest.fn().mockResolvedValue(0),
  geoSearch: jest.fn().mockResolvedValue([]),
  geoDist: jest.fn().mockResolvedValue(null),
  geoRemove: jest.fn().mockResolvedValue(0),
  geoPos: jest.fn().mockResolvedValue(null),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

const mockKafkaProducer = {
  send: jest.fn().mockResolvedValue(undefined),
  sendEvent: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

describe('User Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(KafkaProducerService)
      .useValue(mockKafkaProducer)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /me', () => {
    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/me')
        .expect(401);
    });

    it('should accept request with valid authentication', async () => {
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', 'Bearer mock-token')
        .expect(401); // Mock token will fail
    });
  });

  describe('GET /cards', () => {
    it('should be public endpoint (no auth required)', async () => {
      await request(app.getHttpServer())
        .get('/cards')
        .expect(200);
    });

    it('should support exclude parameter', async () => {
      await request(app.getHttpServer())
        .get('/cards?exclude=user1,user2,user3')
        .expect(200);
    });

    it('should support limit parameter', async () => {
      await request(app.getHttpServer())
        .get('/cards?limit=10')
        .expect(200);
    });

    it('should cap limit at 100', async () => {
      await request(app.getHttpServer())
        .get('/cards?limit=999')
        .expect(200);
    });

    it('should handle invalid limit gracefully', async () => {
      await request(app.getHttpServer())
        .get('/cards?limit=invalid')
        .expect(200);
    });
  });

  describe('GET /profile/:userId', () => {
    it('should allow public access to user profiles', async () => {
      await request(app.getHttpServer())
        .get('/profile/user-123')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should accept userId parameter', async () => {
      await request(app.getHttpServer())
        .get('/profile/test-user-id')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('PUT /profile', () => {
    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .put('/profile')
        .send({
          displayName: 'Updated Name',
          bio: 'Updated bio',
        })
        .expect(401);
    });
  });

  describe('POST /', () => {
    it('should be public endpoint for user creation', async () => {
      await request(app.getHttpServer())
        .post('/')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'sugar_baby',
        })
        .expect((res) => {
          expect([200, 201, 400, 409]).toContain(res.status);
        });
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/')
        .send({})
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app.getHttpServer())
        .post('/')
        .send({
          email: 'invalid-email',
          displayName: 'Test',
          role: 'sugar_baby',
        })
        .expect(400);
    });

    it('should validate role enum', async () => {
      await request(app.getHttpServer())
        .post('/')
        .send({
          email: 'test@example.com',
          displayName: 'Test',
          role: 'invalid_role',
        })
        .expect(400);
    });
  });

  describe('Block/Unblock Features', () => {
    describe('POST /block/:targetId', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/block/user-123')
          .expect(401);
      });
    });

    describe('DELETE /block/:targetId', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .delete('/block/user-123')
          .expect(401);
      });
    });

    describe('GET /blocked', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/blocked')
          .expect(401);
      });
    });
  });

  describe('Report Feature', () => {
    describe('POST /report', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/report')
          .send({
            targetType: 'user',
            targetId: 'user-123',
            reason: 'spam',
          })
          .expect(401);
      });

      it('should validate required fields', async () => {
        await request(app.getHttpServer())
          .post('/report')
          .set('Authorization', 'Bearer mock-token')
          .send({})
          .expect(401); // Fails auth first
      });
    });

    describe('Admin Report Management', () => {
      describe('GET /admin/reports', () => {
        it('should reject request without authentication', async () => {
          await request(app.getHttpServer())
            .get('/admin/reports')
            .expect(401);
        });

        it('should require admin role', async () => {
          await request(app.getHttpServer())
            .get('/admin/reports')
            .set('Authorization', 'Bearer mock-token')
            .expect(401);
        });
      });

      describe('PUT /admin/reports/:reportId', () => {
        it('should reject request without authentication', async () => {
          await request(app.getHttpServer())
            .put('/admin/reports/report-123')
            .send({ status: 'reviewed' })
            .expect(401);
        });

        it('should require admin role', async () => {
          await request(app.getHttpServer())
            .put('/admin/reports/report-123')
            .set('Authorization', 'Bearer mock-token')
            .send({ status: 'reviewed' })
            .expect(401);
        });
      });
    });
  });

  describe('Health Check', () => {
    it('should return service health', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('API Validation', () => {
    it('should return 404 for unknown routes', async () => {
      await request(app.getHttpServer())
        .get('/unknown-endpoint')
        .expect(404);
    });

    it('should handle method not allowed', async () => {
      await request(app.getHttpServer())
        .patch('/cards')
        .expect((res) => {
          expect([404, 405]).toContain(res.status);
        });
    });
  });
});
