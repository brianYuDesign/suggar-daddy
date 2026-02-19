import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Auth E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Endpoints', () => {
    let accessToken: string;
    let refreshToken: string;

    it('POST /api/v1/auth/register - should register new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'SecurePassword123',
        })
        .expect(201);
    });

    it('POST /api/v1/auth/login - should login user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123',
        })
        .expect(200)
        .expect((res) => {
          accessToken = res.body.data.tokens.accessToken;
          refreshToken = res.body.data.tokens.refreshToken;
        });
    });

    it('GET /api/v1/auth/me - should get current user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('POST /api/v1/auth/validate - should validate token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/validate')
        .send({ token: accessToken })
        .expect(200);
    });

    it('POST /api/v1/auth/refresh - should refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
    });

    it('POST /api/v1/auth/logout - should logout user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: accessToken })
        .expect(200);
    });
  });

  describe('User Endpoints', () => {
    it('GET /api/v1/users/profile - should get user profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });
  });

  describe('Permission Checks', () => {
    it('GET /api/v1/users - should require ADMIN role', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(401);
    });
  });
});
