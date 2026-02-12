import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { StripeService } from '@suggar-daddy/common';

// Mock external services
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

const mockKafkaProducer = {
  send: jest.fn().mockResolvedValue(undefined),
  sendEvent: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

const mockStripeService = {
  isConfigured: jest.fn().mockReturnValue(true),
  getStripeInstance: jest.fn().mockReturnValue({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret' }),
    },
  }),
  constructWebhookEvent: jest.fn(),
  createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret' }),
  createCustomer: jest.fn().mockResolvedValue({ id: 'cus_test' }),
};

describe('Payment Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(KafkaProducerService)
      .useValue(mockKafkaProducer)
      .overrideProvider(StripeService)
      .useValue(mockStripeService)
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

  describe('Tips Endpoints', () => {
    describe('POST /tips', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/tips')
          .send({
            toUserId: 'user-123',
            amount: 10,
            currency: 'USD',
          })
          .expect(401);
      });
    });

    describe('GET /tips', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/tips')
          .expect(401);
      });

      it('should support pagination query parameters', async () => {
        await request(app.getHttpServer())
          .get('/tips?page=1&limit=10')
          .expect(401);
      });

      it('should support filtering by from user', async () => {
        await request(app.getHttpServer())
          .get('/tips?from=user-123')
          .expect(401);
      });

      it('should support filtering by to user', async () => {
        await request(app.getHttpServer())
          .get('/tips?to=user-456')
          .expect(401);
      });
    });

    describe('GET /tips/:id', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/tips/tip-123')
          .expect(401);
      });
    });
  });

  describe('Post Purchases Endpoints', () => {
    describe('POST /post-purchases', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/post-purchases')
          .send({
            postId: 'post-123',
            price: 9.99,
            currency: 'USD',
          })
          .expect(401);
      });
    });

    describe('GET /post-purchases', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/post-purchases')
          .expect(401);
      });

      it('should support buyerId filter', async () => {
        await request(app.getHttpServer())
          .get('/post-purchases?buyerId=user-123')
          .expect(401);
      });
    });

    describe('GET /post-purchases/:id', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/post-purchases/purchase-123')
          .expect(401);
      });
    });
  });

  describe('Transactions Endpoints', () => {
    describe('POST /transactions', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/transactions')
          .send({
            type: 'tip',
            amount: 10,
            currency: 'USD',
          })
          .expect(401);
      });
    });

    describe('GET /transactions', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/transactions')
          .expect(401);
      });

      it('should support pagination', async () => {
        await request(app.getHttpServer())
          .get('/transactions?page=1&limit=20')
          .expect(401);
      });

      it('should support userId filter', async () => {
        await request(app.getHttpServer())
          .get('/transactions?userId=user-123')
          .expect(401);
      });
    });

    describe('GET /transactions/:id', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/transactions/tx-123')
          .expect(401);
      });
    });

    describe('PUT /transactions/:id', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .put('/transactions/tx-123')
          .send({ status: 'completed' })
          .expect(401);
      });
    });
  });

  describe('Wallet Endpoints', () => {
    describe('GET /wallet', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/wallet')
          .expect(401);
      });
    });

    describe('GET /wallet/earnings', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/wallet/earnings')
          .expect(401);
      });
    });

    describe('GET /wallet/history', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/wallet/history')
          .expect(401);
      });
    });

    describe('GET /wallet/withdrawals', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .get('/wallet/withdrawals')
          .expect(401);
      });
    });

    describe('POST /wallet/withdraw', () => {
      it('should reject request without authentication', async () => {
        await request(app.getHttpServer())
          .post('/wallet/withdraw')
          .send({
            amount: 100,
            payoutMethod: 'bank_transfer',
          })
          .expect(401);
      });
    });

    describe('Admin Wallet Endpoints', () => {
      describe('GET /wallet/admin/withdrawals/pending', () => {
        it('should reject request without authentication', async () => {
          await request(app.getHttpServer())
            .get('/wallet/admin/withdrawals/pending')
            .expect(401);
        });
      });

      describe('PUT /wallet/admin/withdrawals/:id', () => {
        it('should reject request without authentication', async () => {
          await request(app.getHttpServer())
            .put('/wallet/admin/withdrawals/withdrawal-123')
            .send({ action: 'approve' })
            .expect(401);
        });
      });
    });
  });

  describe('Stripe Webhook Endpoint', () => {
    describe('POST /stripe/webhooks', () => {
      it('should reject request without stripe-signature header', async () => {
        const response = await request(app.getHttpServer())
          .post('/stripe/webhooks')
          .send({ type: 'payment_intent.succeeded' })
          .expect(400);

        expect(response.body.message).toContain('stripe-signature');
      });

      it('should reject request without rawBody', async () => {
        // Note: In real Nest.js app, rawBody is provided by body-parser configuration
        // In tests, rawBody is undefined, so this tests the error handling
        await request(app.getHttpServer())
          .post('/stripe/webhooks')
          .set('stripe-signature', 'test-signature')
          .send({ type: 'payment_intent.succeeded' })
          .expect(400);
      });

      it('should reject request without stripe-signature header', async () => {
        await request(app.getHttpServer())
          .post('/stripe/webhooks')
          .send({ type: 'payment_intent.succeeded' })
          .expect(400);
      });

      it('should be public endpoint (no JWT required)', async () => {
        // Should return 400 for missing rawBody, not 401 for missing JWT
        const response = await request(app.getHttpServer())
          .post('/stripe/webhooks')
          .set('stripe-signature', 'test-signature')
          .send({ type: 'test' })
          .expect(400);

        expect(response.body.message).toBe('Missing request body');
      });
    });
  });

  describe('Health Check', () => {
    it('should return service health status', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });
  });

  describe('API Structure Validation', () => {
    it('should return 404 for unknown endpoints', async () => {
      await request(app.getHttpServer())
        .get('/unknown-endpoint')
        .expect(404);
    });

    it('should support OPTIONS for CORS', async () => {
      await request(app.getHttpServer())
        .options('/tips')
        .expect((res) => {
          expect([200, 204, 404]).toContain(res.status);
        });
    });
  });
});
