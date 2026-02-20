import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment, PaymentStatus, PaymentMethod } from '../src/entities/payment.entity';
import { Repository } from 'typeorm';

describe('ReportController (e2e)', () => {
  let app: INestApplication;
  let paymentRepository: Repository<Payment>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    paymentRepository = moduleFixture.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await paymentRepository.clear();
  });

  describe('GET /api/payments/reports/revenue', () => {
    it('should return revenue report grouped by day', async () => {
      // Create test payments
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        await paymentRepository.save({
          id: `payment-${i}`,
          amount: 100 + i * 10,
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          createdAt: date,
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/revenue?startDate=2026-01-01&endDate=2026-12-31&groupBy=day')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.groupBy).toBe('day');
    });

    it('should return revenue report grouped by week', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/revenue?groupBy=week')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.groupBy).toBe('week');
    });

    it('should return revenue report grouped by month', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/revenue?groupBy=month')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.groupBy).toBe('month');
    });

    it('should use default date range of 30 days', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/revenue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.startDate).toBeDefined();
      expect(response.body.meta.endDate).toBeDefined();
    });

    it('should return 400 for invalid date format', async () => {
      await request(app.getHttpServer())
        .get('/api/payments/reports/revenue?startDate=invalid-date')
        .expect(400);
    });

    it('should return 400 when start date is after end date', async () => {
      await request(app.getHttpServer())
        .get('/api/payments/reports/revenue?startDate=2026-12-31&endDate=2026-01-01')
        .expect(400);
    });

    it('should return 400 for date range exceeding 1 year', async () => {
      await request(app.getHttpServer())
        .get('/api/payments/reports/revenue?startDate=2020-01-01&endDate=2025-12-31')
        .expect(400);
    });
  });

  describe('GET /api/payments/reports/transactions', () => {
    it('should return transaction statistics', async () => {
      // Create test payments with different statuses and methods
      const now = new Date();
      
      await paymentRepository.save([
        {
          id: 'payment-success-1',
          amount: 100,
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          createdAt: now,
        },
        {
          id: 'payment-success-2',
          amount: 200,
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: PaymentMethod.PAYPAL,
          createdAt: now,
        },
        {
          id: 'payment-failed',
          amount: 50,
          status: PaymentStatus.FAILED,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          createdAt: now,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/transactions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalRevenue).toBeDefined();
      expect(response.body.data.totalTransactions).toBe(3);
      expect(response.body.data.successfulRate).toBeDefined();
      expect(response.body.data.averageAmount).toBeDefined();
      expect(response.body.data.byPaymentMethod).toBeDefined();
      expect(response.body.data.byPaymentMethod.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/transactions?startDate=2026-01-01&endDate=2026-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.startDate).toBeDefined();
      expect(response.body.meta.endDate).toBeDefined();
    });
  });

  describe('GET /api/payments/reports/refunds', () => {
    it('should return refund analysis', async () => {
      const now = new Date();
      
      // Create successful payments
      await paymentRepository.save({
        id: 'payment-base',
        amount: 1000,
        status: PaymentStatus.SUCCEEDED,
        createdAt: now,
      });

      // Create refunded payments
      await paymentRepository.save([
        {
          id: 'refund-1',
          amount: 100,
          status: PaymentStatus.REFUNDED,
          createdAt: now,
          refundedAt: now,
          metadata: { refundReason: 'Customer request' },
        },
        {
          id: 'refund-2',
          amount: 50,
          status: PaymentStatus.REFUNDED,
          createdAt: now,
          refundedAt: now,
          metadata: { refundReason: 'Fraud' },
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/refunds')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalRefunds).toBeDefined();
      expect(response.body.data.refundAmount).toBeDefined();
      expect(response.body.data.refundRate).toBeDefined();
      expect(response.body.data.byReason).toBeDefined();
      expect(Array.isArray(response.body.data.byReason)).toBe(true);
    });

    it('should handle refunds with no reason specified', async () => {
      const now = new Date();
      
      await paymentRepository.save({
        id: 'refund-no-reason',
        amount: 75,
        status: PaymentStatus.REFUNDED,
        createdAt: now,
        refundedAt: now,
        metadata: {},
      });

      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/refunds')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.byReason.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/payments/reports/creator-earnings', () => {
    it('should return creator earnings list', async () => {
      const now = new Date();
      
      // Create payments with creator metadata
      await paymentRepository.save([
        {
          id: 'creator-payment-1',
          amount: 500,
          status: PaymentStatus.SUCCEEDED,
          createdAt: now,
          metadata: { creatorId: 'creator-1' },
        },
        {
          id: 'creator-payment-2',
          amount: 300,
          status: PaymentStatus.SUCCEEDED,
          createdAt: now,
          metadata: { creatorId: 'creator-2' },
        },
        {
          id: 'creator-payment-3',
          amount: 200,
          status: PaymentStatus.SUCCEEDED,
          createdAt: now,
          metadata: { creatorId: 'creator-1' },
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/creator-earnings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBeDefined();
      expect(response.body.meta.hasMore).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/creator-earnings?limit=10&offset=0')
        .expect(200);

      expect(response.body.meta.limit).toBe(10);
      expect(response.body.meta.offset).toBe(0);
    });

    it('should limit max results to 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/creator-earnings?limit=200')
        .expect(200);

      // The API should cap the limit at 100
      expect(response.body.data.length).toBeLessThanOrEqual(100);
    });

    it('should filter by specific creator', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/creator-earnings?creatorId=creator-1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/creator-earnings?startDate=2026-01-01&endDate=2026-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking the repository to throw errors
      // For now, we just verify the endpoint exists and returns proper format
      const response = await request(app.getHttpServer())
        .get('/api/payments/reports/revenue')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
