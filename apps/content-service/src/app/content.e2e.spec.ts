import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

const mockKafkaProducer = {
  sendEvent: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

describe('Content Service (e2e)', () => {
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

  describe('Posts Endpoints', () => {
    describe('POST /posts', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/posts')
          .send({
            title: 'Test Post',
            content: 'Test content',
          })
          .expect(401);
      });
    });

    describe('GET /posts', () => {
      it('should allow public access to posts list', async () => {
        await request(app.getHttpServer())
          .get('/posts')
          .expect(200);
      });

      it('should support pagination', async () => {
        await request(app.getHttpServer())
          .get('/posts?page=1&limit=10')
          .expect(200);
      });

      it('should support creatorId filter', async () => {
        await request(app.getHttpServer())
          .get('/posts?creatorId=user-123')
          .expect(200);
      });
    });

    describe('GET /posts/:id', () => {
      it('should allow public access to post detail', async () => {
        await request(app.getHttpServer())
          .get('/posts/post-123')
          .expect((res) => {
            expect([200, 404]).toContain(res.status);
          });
      });
    });

    describe('PUT /posts/:id', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .put('/posts/post-123')
          .send({ title: 'Updated' })
          .expect(401);
      });
    });

    describe('DELETE /posts/:id', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .delete('/posts/post-123')
          .expect(401);
      });
    });
  });

  describe('Moderation Endpoints', () => {
    describe('POST /moderation/queue', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/moderation/queue')
          .send({
            contentType: 'post',
            contentId: 'post-123',
          })
          .expect(401);
      });
    });

    describe('GET /moderation/pending', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/moderation/pending')
          .expect(401);
      });
    });
  });

  describe('Health Check', () => {
    it('should return service health', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200);
    });
  });
});
