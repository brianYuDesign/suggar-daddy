import supertest from 'supertest';
import { API_BASE_URLS, USERS } from './fixtures';

const authApi = supertest(API_BASE_URLS.auth);
const contentApi = supertest(API_BASE_URLS.content);
const paymentApi = supertest(API_BASE_URLS.payment);
const recommendationApi = supertest(API_BASE_URLS.recommendation);

describe('Auth Service API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  describe('POST /auth/register', () => {
    test('should register a new user', async () => {
      const newUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPass123!@#',
        name: 'Test User',
      };

      const response = await authApi
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body).toHaveProperty('accessToken');
    });

    test('should reject duplicate email', async () => {
      const response = await authApi
        .post('/auth/register')
        .send({
          email: USERS.viewer.email,
          password: 'TestPass123!@#',
          name: 'Test User',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate required fields', async () => {
      const response = await authApi
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          // missing password and name
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    test('should validate email format', async () => {
      const response = await authApi
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPass123!@#',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    test('should validate password strength', async () => {
      const response = await authApi
        .post('/auth/register')
        .send({
          email: `weak-${Date.now()}@example.com`,
          password: '123', // weak password
          name: 'Test User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /auth/login', () => {
    test('should login with correct credentials', async () => {
      const response = await authApi
        .post('/auth/login')
        .send({
          email: USERS.viewer.email,
          password: USERS.viewer.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(USERS.viewer.email);

      authToken = response.body.accessToken;
      userId = response.body.user.id;
    });

    test('should reject incorrect password', async () => {
      const response = await authApi
        .post('/auth/login')
        .send({
          email: USERS.viewer.email,
          password: 'WrongPassword123!@#',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject non-existent user', async () => {
      const response = await authApi
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!@#',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/profile', () => {
    test('should get user profile with valid token', async () => {
      const response = await authApi
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(USERS.viewer.email);
    });

    test('should reject request without token', async () => {
      const response = await authApi
        .get('/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject request with invalid token', async () => {
      const response = await authApi
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /auth/profile', () => {
    test('should update user profile', async () => {
      const updatedData = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      const response = await authApi
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.bio).toBe(updatedData.bio);
    });

    test('should reject profile update without token', async () => {
      const response = await authApi
        .put('/auth/profile')
        .send({ name: 'New Name' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await authApi
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });
});

describe('Content Service API Integration Tests', () => {
  let authToken: string;
  let contentId: string;

  beforeAll(async () => {
    // Login to get token
    const loginResponse = await authApi
      .post('/auth/login')
      .send({
        email: USERS.creator.email,
        password: USERS.creator.password,
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('GET /content', () => {
    test('should list all content', async () => {
      const response = await contentApi
        .get('/content')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    test('should support pagination', async () => {
      const response = await contentApi
        .get('/content?page=1&limit=10')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should support filtering by category', async () => {
      const response = await contentApi
        .get('/content?category=Educational')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should support search', async () => {
      const response = await contentApi
        .get('/content?search=test')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /content (Creator)', () => {
    test('should create new content', async () => {
      const newContent = {
        title: `Test Content ${Date.now()}`,
        description: 'Test description',
        category: 'Educational',
        duration: 3600,
        contentType: 'PREMIUM',
        price: 9.99,
      };

      const response = await contentApi
        .post('/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newContent)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(newContent.title);
      expect(response.body.creator_id).toBeDefined();

      contentId = response.body.id;
    });

    test('should reject content creation without token', async () => {
      const response = await contentApi
        .post('/content')
        .send({
          title: 'Test',
          description: 'Test',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate required fields', async () => {
      const response = await contentApi
        .post('/content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          // missing description and other fields
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /content/:id', () => {
    test('should get content by ID', async () => {
      const response = await contentApi
        .get(`/content/${contentId}`)
        .expect(200);

      expect(response.body.id).toBe(contentId);
      expect(response.body).toHaveProperty('title');
    });

    test('should return 404 for non-existent content', async () => {
      const response = await contentApi
        .get('/content/99999999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /content/:id (Creator)', () => {
    test('should update content', async () => {
      const updateData = {
        title: `Updated ${Date.now()}`,
        description: 'Updated description',
      };

      const response = await contentApi
        .put(`/content/${contentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
    });

    test('should reject update without token', async () => {
      const response = await contentApi
        .put(`/content/${contentId}`)
        .send({ title: 'Updated' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /content/:id (Creator)', () => {
    test('should delete content', async () => {
      const response = await contentApi
        .delete(`/content/${contentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    test('should return 404 after deletion', async () => {
      const response = await contentApi
        .get(`/content/${contentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Payment Service API Integration Tests', () => {
  let authToken: string;
  let subscriptionId: string;

  beforeAll(async () => {
    const loginResponse = await authApi
      .post('/auth/login')
      .send({
        email: USERS.viewer.email,
        password: USERS.viewer.password,
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('GET /subscriptions/plans', () => {
    test('should list available subscription plans', async () => {
      const response = await paymentApi
        .get('/subscriptions/plans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const plan = response.body[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('price');
    });
  });

  describe('POST /subscriptions', () => {
    test('should create subscription', async () => {
      const response = await paymentApi
        .post('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: 'premium_monthly',
          paymentMethodId: 'pm_test_card',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toMatch(/active|pending/);

      subscriptionId = response.body.id;
    });

    test('should reject subscription without token', async () => {
      const response = await paymentApi
        .post('/subscriptions')
        .send({
          planId: 'premium_monthly',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /subscriptions', () => {
    test('should get user subscriptions', async () => {
      const response = await paymentApi
        .get('/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /subscriptions/:id', () => {
    test('should get subscription details', async () => {
      const response = await paymentApi
        .get(`/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(subscriptionId);
    });
  });

  describe('POST /payments', () => {
    test('should create payment intent', async () => {
      const response = await paymentApi
        .post('/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 999,
          currency: 'USD',
          planId: 'premium_monthly',
        })
        .expect(201);

      expect(response.body).toHaveProperty('clientSecret');
    });
  });

  describe('GET /invoices', () => {
    test('should list user invoices', async () => {
      const response = await paymentApi
        .get('/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

describe('Recommendation Service API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginResponse = await authApi
      .post('/auth/login')
      .send({
        email: USERS.viewer.email,
        password: USERS.viewer.password,
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('GET /recommendations', () => {
    test('should get personalized recommendations', async () => {
      const response = await recommendationApi
        .get('/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
    });

    test('should support category filter', async () => {
      const response = await recommendationApi
        .get('/recommendations?category=Educational')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should support limit parameter', async () => {
      const response = await recommendationApi
        .get('/recommendations?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /recommendations/feedback', () => {
    test('should submit recommendation feedback', async () => {
      const response = await recommendationApi
        .post('/recommendations/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contentId: '123',
          feedback: 'like',
          interactionType: 'click',
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /trending', () => {
    test('should get trending content', async () => {
      const response = await recommendationApi
        .get('/trending')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should support time range', async () => {
      const response = await recommendationApi
        .get('/trending?timeRange=week')
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
