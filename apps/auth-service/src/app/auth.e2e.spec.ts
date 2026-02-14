import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

// Mock external services
const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  keys: jest.fn().mockResolvedValue([]),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

const mockKafkaProducer = {
  send: jest.fn().mockResolvedValue(undefined),
  sendEvent: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
};

describe('Auth Service (e2e)', () => {
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

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test@1234',
        displayName: `Test User`,
        role: 'sugar_baby',
      };

      mockRedisService.get.mockResolvedValue(null); // No existing user
      mockRedisService.set.mockResolvedValue('OK');

      const response = await request(app.getHttpServer())
        .post('/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('tokenType', 'Bearer');
    });

    it('should reject registration with duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      const registerDto = {
        email,
        password: 'Test@1234',
        displayName: `Duplicate User`,
        role: 'sugar_baby',
      };

      mockRedisService.get.mockResolvedValue('existing-user-id');

      await request(app.getHttpServer())
        .post('/register')
        .send(registerDto)
        .expect(409);
    });

    it('should reject registration with invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'Test@1234',
        displayName: 'Test User',
        role: 'sugar_baby',
      };

      await request(app.getHttpServer())
        .post('/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      const registerDto = {
        email: `test-${Date.now()}@example.com`,
        password: '123',
        displayName: 'Test User',
        role: 'sugar_baby',
      };

      await request(app.getHttpServer())
        .post('/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject registration with invalid role', async () => {
      const registerDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test@1234',
        displayName: 'Test User',
        role: 'invalid_role',
      };

      await request(app.getHttpServer())
        .post('/register')
        .send(registerDto)
        .expect(400);
    });

    it('should reject registration without displayName', async () => {
      const registerDto = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test@1234',
        role: 'sugar_baby',
      };

      await request(app.getHttpServer())
        .post('/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('POST /login', () => {
    it('should reject login with missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/login')
        .send({})
        .expect(400);
    });

    it('should reject login with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/login')
        .send({
          email: 'invalid',
          password: 'password',
        })
        .expect(400);
    });

    it('should reject login when user not found', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test@1234',
        })
        .expect(401);
    });
  });

  describe('POST /refresh', () => {
    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should reject request without refresh token', async () => {
      await request(app.getHttpServer())
        .post('/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('POST /logout', () => {
    it('should require authentication for logout', async () => {
      await request(app.getHttpServer())
        .post('/logout')
        .send({ refreshToken: 'some-token' })
        .expect(401);
    });

    it('should reject logout without authentication', async () => {
      await request(app.getHttpServer())
        .post('/logout')
        .send({ refreshToken: 'some-token' })
        .expect(401);
    });
  });

  describe('GET /me', () => {
    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get('/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /change-password', () => {
    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .post('/change-password')
        .send({
          oldPassword: 'Old@1234',
          newPassword: 'New@1234',
        })
        .expect(401);
    });

    it('should reject request without required fields', async () => {
      await request(app.getHttpServer())
        .post('/change-password')
        .set('Authorization', 'Bearer mock-token')
        .send({ oldPassword: 'test' })
        .expect(401); // Will fail auth first
    });
  });

  describe('Admin Endpoints Authorization', () => {
    describe('POST /admin/suspend/:userId', () => {
      it('should reject unauthenticated request', async () => {
        await request(app.getHttpServer())
          .post('/admin/suspend/test-user-id')
          .expect(401);
      });

      it('should reject request with invalid token', async () => {
        await request(app.getHttpServer())
          .post('/admin/suspend/test-user-id')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('POST /admin/ban/:userId', () => {
      it('should reject unauthenticated request', async () => {
        await request(app.getHttpServer())
          .post('/admin/ban/test-user-id')
          .expect(401);
      });
    });

    describe('POST /admin/reactivate/:userId', () => {
      it('should reject unauthenticated request', async () => {
        await request(app.getHttpServer())
          .post('/admin/reactivate/test-user-id')
          .expect(401);
      });
    });
  });

  describe('Email Verification', () => {
    describe('POST /verify-email/:token', () => {
      it('should accept request with token parameter', async () => {
        mockRedisService.get.mockResolvedValue(null);

        await request(app.getHttpServer())
          .post('/verify-email/test-token')
          .expect(400); // Invalid token
      });
    });

    describe('POST /resend-verification', () => {
      it('should reject without authentication', async () => {
        await request(app.getHttpServer())
          .post('/resend-verification')
          .expect(401);
      });
    });
  });

  describe('Password Reset', () => {
    describe('POST /forgot-password', () => {
      it('should accept valid email', async () => {
        mockRedisService.get.mockResolvedValue('user-id');
        mockRedisService.set.mockResolvedValue('OK');

        const response = await request(app.getHttpServer())
          .post('/forgot-password')
          .send({ email: 'test@example.com' })
          .expect(201);

        expect(response.body).toHaveProperty('success');
      });

      it('should reject invalid email', async () => {
        await request(app.getHttpServer())
          .post('/forgot-password')
          .send({ email: 'invalid' })
          .expect(400);
      });

      it('should reject without email', async () => {
        await request(app.getHttpServer())
          .post('/forgot-password')
          .send({})
          .expect(400);
      });
    });

    describe('POST /reset-password', () => {
      it('should reject without token', async () => {
        await request(app.getHttpServer())
          .post('/reset-password')
          .send({ newPassword: 'New@1234' })
          .expect(400);
      });

      it('should reject without newPassword', async () => {
        await request(app.getHttpServer())
          .post('/reset-password')
          .send({ token: 'test-token' })
          .expect(400);
      });
    });
  });

  describe('Validation', () => {
    it('should enforce email validation on register', async () => {
      await request(app.getHttpServer())
        .post('/register')
        .send({
          email: 'not-an-email',
          password: 'Test@1234',
          displayName: 'Test',
          role: 'sugar_baby',
        })
        .expect(400);
    });

    it('should enforce minimum password length on register', async () => {
      await request(app.getHttpServer())
        .post('/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'short',
          displayName: 'Test',
          role: 'sugar_baby',
        })
        .expect(400);
    });

    it('should enforce role validation on register', async () => {
      await request(app.getHttpServer())
        .post('/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'Test@1234',
          displayName: 'Test',
          role: 'invalid',
        })
        .expect(400);
    });
  });
});
