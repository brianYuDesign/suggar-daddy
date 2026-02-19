/**
 * Integration Test Suite for Sugar-Daddy Platform
 * 覆蓋所有 6 個服務的聯調和完整業務流程
 */

const axios = require('axios');
const expect = require('chai').expect;

const API_GATEWAY = 'http://localhost:3000/api/v1';
const AUTH_SERVICE = 'http://localhost:3001/api/v1';
const CONTENT_SERVICE = 'http://localhost:3001/api/v1';
const RECOMMENDATION_SERVICE = 'http://localhost:3000/api/v1';
const PAYMENT_SERVICE = 'http://localhost:3002/api/v1';
const SUBSCRIPTION_SERVICE = 'http://localhost:3003/api/v1';

// Test utilities
class TestContext {
  constructor() {
    this.users = {};
    this.subscriptions = {};
    this.videos = {};
    this.payments = {};
    this.tokens = {};
  }
}

const ctx = new TestContext();

// ========================
// 1. AUTH SERVICE TESTS
// ========================

describe('AUTH SERVICE - User Authentication & Authorization', () => {
  
  describe('User Registration & Login', () => {
    it('should register a new user', async () => {
      const response = await axios.post(`${AUTH_SERVICE}/auth/register`, {
        email: 'testuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('id');
      expect(response.data.data).to.have.property('email', 'testuser@example.com');

      ctx.users.testUser = response.data.data;
    });

    it('should login successfully', async () => {
      const response = await axios.post(`${AUTH_SERVICE}/auth/login`, {
        email: 'testuser@example.com',
        password: 'SecurePassword123!',
      });

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('accessToken');
      expect(response.data.data).to.have.property('refreshToken');

      ctx.tokens.testUser = response.data.data.accessToken;
    });

    it('should reject invalid credentials', async () => {
      try {
        await axios.post(`${AUTH_SERVICE}/auth/login`, {
          email: 'testuser@example.com',
          password: 'WrongPassword',
        });
        throw new Error('Should have failed');
      } catch (error) {
        expect(error.response.status).to.equal(401);
        expect(error.response.data.success).to.be.false;
      }
    });

    it('should get current user profile', async () => {
      const response = await axios.get(`${AUTH_SERVICE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${ctx.tokens.testUser}`,
        },
      });

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data.email).to.equal('testuser@example.com');
    });

    it('should change password', async () => {
      const response = await axios.post(
        `${AUTH_SERVICE}/auth/change-password`,
        {
          oldPassword: 'SecurePassword123!',
          newPassword: 'NewSecurePassword456!',
        },
        {
          headers: {
            Authorization: `Bearer ${ctx.tokens.testUser}`,
          },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
    });

    it('should logout and invalidate token', async () => {
      const logoutResponse = await axios.post(
        `${AUTH_SERVICE}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${ctx.tokens.testUser}`,
          },
        }
      );

      expect(logoutResponse.status).to.equal(200);
      expect(logoutResponse.data.success).to.be.true;

      // Try to use token - should fail
      try {
        await axios.get(`${AUTH_SERVICE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${ctx.tokens.testUser}`,
          },
        });
        throw new Error('Should have failed with blacklisted token');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });
  });

  describe('Role Based Access Control (RBAC)', () => {
    let adminUser, creatorUser, regularUser;
    let adminToken, creatorToken, regularToken;

    beforeEach(async () => {
      // Create users with different roles
      const adminRes = await axios.post(`${AUTH_SERVICE}/auth/register`, {
        email: 'admin@example.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });
      adminUser = adminRes.data.data;

      const creatorRes = await axios.post(`${AUTH_SERVICE}/auth/register`, {
        email: 'creator@example.com',
        password: 'CreatorPass123!',
        firstName: 'Creator',
        lastName: 'User',
        role: 'creator',
      });
      creatorUser = creatorRes.data.data;

      const userRes = await axios.post(`${AUTH_SERVICE}/auth/register`, {
        email: 'user@example.com',
        password: 'UserPass123!',
        firstName: 'Regular',
        lastName: 'User',
        role: 'user',
      });
      regularUser = userRes.data.data;

      // Get tokens
      const adminLogin = await axios.post(`${AUTH_SERVICE}/auth/login`, {
        email: 'admin@example.com',
        password: 'AdminPass123!',
      });
      adminToken = adminLogin.data.data.accessToken;

      const creatorLogin = await axios.post(`${AUTH_SERVICE}/auth/login`, {
        email: 'creator@example.com',
        password: 'CreatorPass123!',
      });
      creatorToken = creatorLogin.data.data.accessToken;

      const userLogin = await axios.post(`${AUTH_SERVICE}/auth/login`, {
        email: 'user@example.com',
        password: 'UserPass123!',
      });
      regularToken = userLogin.data.data.accessToken;
    });

    it('should enforce admin-only endpoints', async () => {
      // Admin can access
      const adminRes = await axios.get(`${AUTH_SERVICE}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(adminRes.status).to.equal(200);

      // Regular user cannot access
      try {
        await axios.get(`${AUTH_SERVICE}/users`, {
          headers: { Authorization: `Bearer ${regularToken}` },
        });
        throw new Error('Should have been forbidden');
      } catch (error) {
        expect(error.response.status).to.equal(403);
      }
    });

    it('should enforce creator-only operations', async () => {
      // Creator can upload videos
      const creatorRes = await axios.post(
        `${CONTENT_SERVICE}/videos`,
        { title: 'My Video' },
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );
      expect(creatorRes.status).to.equal(201);
    });
  });
});

// ========================
// 2. CONTENT STREAMING TESTS
// ========================

describe('CONTENT STREAMING SERVICE - Video Management', () => {
  
  let creatorToken;
  let uploadSessionId;

  beforeEach(async () => {
    const res = await axios.post(`${AUTH_SERVICE}/auth/login`, {
      email: 'creator@example.com',
      password: 'CreatorPass123!',
    });
    creatorToken = res.data.data.accessToken;
  });

  describe('Video Upload & Transcoding', () => {
    it('should initialize upload session', async () => {
      const response = await axios.post(
        `${CONTENT_SERVICE}/videos/upload/init`,
        {
          title: 'Test Video',
          description: 'A test video for integration',
          totalSize: 1024 * 1024 * 100, // 100MB
          chunkSize: 1024 * 1024 * 5, // 5MB chunks
        },
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('sessionId');
      expect(response.data.data).to.have.property('uploadUrl');

      uploadSessionId = response.data.data.sessionId;
      ctx.videos.uploadSession = response.data.data;
    });

    it('should support resumable upload (chunk upload)', async () => {
      const chunkData = Buffer.alloc(1024 * 1024 * 5); // 5MB

      const response = await axios.post(
        `${CONTENT_SERVICE}/videos/upload/chunk`,
        {
          sessionId: uploadSessionId,
          chunkIndex: 0,
          data: chunkData,
        },
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('progress');
      expect(response.data.data.progress).to.be.greaterThan(0);
    });

    it('should complete upload and trigger transcoding', async () => {
      const response = await axios.post(
        `${CONTENT_SERVICE}/videos/upload/complete`,
        {
          sessionId: uploadSessionId,
        },
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('videoId');
      expect(response.data.data).to.have.property('transcodingStatus', 'initiated');

      ctx.videos.videoId = response.data.data.videoId;
    });
  });

  describe('Streaming & Quality Profiles', () => {
    it('should get video streaming profile', async () => {
      const response = await axios.get(
        `${CONTENT_SERVICE}/videos/${ctx.videos.videoId}/quality/profiles`,
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      expect(response.data.data[0]).to.have.property('quality');
      expect(response.data.data[0]).to.have.property('bitrate');
      expect(response.data.data[0]).to.have.property('url');
    });

    it('should provide HLS streaming URL', async () => {
      const response = await axios.get(
        `${CONTENT_SERVICE}/videos/${ctx.videos.videoId}/stream`,
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('hlsUrl');
      expect(response.data.data.hlsUrl).to.include('.m3u8');
    });

    it('should check transcoding progress', async () => {
      const response = await axios.get(
        `${CONTENT_SERVICE}/transcoding/${ctx.videos.videoId}/progress`,
        {
          headers: { Authorization: `Bearer ${creatorToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('status');
      expect(response.data.data).to.have.property('progress');
      expect(response.data.data.progress).to.be.between(0, 100);
    });
  });
});

// ========================
// 3. RECOMMENDATION SERVICE TESTS
// ========================

describe('RECOMMENDATION SERVICE - Content Recommendations', () => {
  
  let userId;
  let userToken;
  let videoId;

  beforeEach(async () => {
    // Get a user token
    const res = await axios.post(`${AUTH_SERVICE}/auth/login`, {
      email: 'user@example.com',
      password: 'UserPass123!',
    });
    userToken = res.data.data.accessToken;
    userId = res.data.data.userId;
  });

  describe('User Personalization & Engagement', () => {
    it('should record user interaction (view)', async () => {
      const response = await axios.post(
        `${RECOMMENDATION_SERVICE}/recommendations/interactions`,
        {
          user_id: userId,
          content_id: ctx.videos.videoId,
          interaction_type: 'view',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(204);
    });

    it('should record user interaction (like)', async () => {
      const response = await axios.post(
        `${RECOMMENDATION_SERVICE}/recommendations/interactions`,
        {
          user_id: userId,
          content_id: ctx.videos.videoId,
          interaction_type: 'like',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(204);
    });

    it('should get personalized recommendations', async () => {
      const response = await axios.get(
        `${RECOMMENDATION_SERVICE}/recommendations/${userId}?limit=20`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('user_id', userId);
      expect(response.data.data).to.have.property('recommendations');
      expect(response.data.data.recommendations).to.be.an('array');

      if (response.data.data.recommendations.length > 0) {
        const rec = response.data.data.recommendations[0];
        expect(rec).to.have.property('content_id');
        expect(rec).to.have.property('score');
        expect(rec).to.have.property('reason');
      }
    });
  });
});

// ========================
// 4. PAYMENT SERVICE TESTS
// ========================

describe('PAYMENT SERVICE - Payment Processing', () => {
  
  let userId;
  let userToken;
  let paymentIntentId;

  beforeEach(async () => {
    const res = await axios.post(`${AUTH_SERVICE}/auth/login`, {
      email: 'user@example.com',
      password: 'UserPass123!',
    });
    userToken = res.data.data.accessToken;
    userId = res.data.data.userId;
  });

  describe('One-Time Payments', () => {
    it('should create payment intent', async () => {
      const response = await axios.post(
        `${PAYMENT_SERVICE}/payments/create`,
        {
          user_id: userId,
          amount: 9.99,
          currency: 'USD',
          description: 'Premium subscription',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('payment_id');
      expect(response.data.data).to.have.property('status', 'pending');

      paymentIntentId = response.data.data.payment_id;
      ctx.payments.paymentId = paymentIntentId;
    });

    it('should confirm payment', async () => {
      const response = await axios.post(
        `${PAYMENT_SERVICE}/payments/${paymentIntentId}/confirm`,
        {
          payment_method: 'pm_card_visa',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('status', 'succeeded');
    });

    it('should retrieve payment details', async () => {
      const response = await axios.get(
        `${PAYMENT_SERVICE}/payments/${paymentIntentId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('payment_id', paymentIntentId);
      expect(response.data.data).to.have.property('amount', 9.99);
    });

    it('should list user payment history', async () => {
      const response = await axios.get(
        `${PAYMENT_SERVICE}/payments/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
    });
  });
});

// ========================
// 5. SUBSCRIPTION SERVICE TESTS
// ========================

describe('SUBSCRIPTION SERVICE - Subscription Management', () => {
  
  let userId;
  let userToken;
  let subscriptionId;
  let planId;

  beforeEach(async () => {
    const res = await axios.post(`${AUTH_SERVICE}/auth/login`, {
      email: 'user@example.com',
      password: 'UserPass123!',
    });
    userToken = res.data.data.accessToken;
    userId = res.data.data.userId;
  });

  describe('Subscription Plans & Management', () => {
    it('should list available subscription plans', async () => {
      const response = await axios.get(
        `${SUBSCRIPTION_SERVICE}/subscription/plans`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.be.an('array');
      expect(response.data.data.length).to.be.greaterThan(0);

      const plan = response.data.data[0];
      expect(plan).to.have.property('id');
      expect(plan).to.have.property('name');
      expect(plan).to.have.property('monthlyPrice');
      expect(plan).to.have.property('features');

      planId = plan.id;
    });

    it('should get subscription plan details', async () => {
      const response = await axios.get(
        `${SUBSCRIPTION_SERVICE}/subscription/plans/${planId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('id', planId);
    });

    it('should create a subscription', async () => {
      const response = await axios.post(
        `${SUBSCRIPTION_SERVICE}/subscriptions`,
        {
          userId,
          planId,
          stripeToken: 'tok_visa',
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(201);
      expect(response.data.success).to.be.true;
      expect(response.data.data).to.have.property('id');
      expect(response.data.data).to.have.property('status', 'active');
      expect(response.data.data).to.have.property('nextBillingDate');

      subscriptionId = response.data.data.id;
      ctx.subscriptions.activeSubscription = response.data.data;
    });

    it('should get user subscription', async () => {
      const response = await axios.get(
        `${SUBSCRIPTION_SERVICE}/subscriptions/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('userId', userId);
      expect(response.data.data).to.have.property('status', 'active');
    });

    it('should pause subscription', async () => {
      const response = await axios.post(
        `${SUBSCRIPTION_SERVICE}/subscriptions/${subscriptionId}/pause`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('status', 'paused');
    });

    it('should resume subscription', async () => {
      const response = await axios.post(
        `${SUBSCRIPTION_SERVICE}/subscriptions/${subscriptionId}/resume`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('status', 'active');
    });

    it('should get billing history', async () => {
      const response = await axios.get(
        `${SUBSCRIPTION_SERVICE}/subscriptions/${subscriptionId}/billing-history`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.be.an('array');
    });

    it('should cancel subscription', async () => {
      const response = await axios.post(
        `${SUBSCRIPTION_SERVICE}/subscriptions/${subscriptionId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('status', 'cancelled');
    });
  });
});

// ========================
// 6. API GATEWAY INTEGRATION TESTS
// ========================

describe('API GATEWAY - Unified API Endpoint', () => {
  
  let userToken;
  let userId;

  beforeEach(async () => {
    const res = await axios.post(`${API_GATEWAY}/auth/login`, {
      email: 'user@example.com',
      password: 'UserPass123!',
    });
    userToken = res.data.data.accessToken;
    userId = res.data.data.userId;
  });

  describe('Gateway Routing & Proxying', () => {
    it('should route auth requests correctly', async () => {
      const response = await axios.get(`${API_GATEWAY}/auth/me`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('email');
    });

    it('should route video requests correctly', async () => {
      const response = await axios.get(
        `${API_GATEWAY}/videos?limit=10`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.be.an('array');
    });

    it('should route recommendation requests correctly', async () => {
      const response = await axios.get(
        `${API_GATEWAY}/recommendations/${userId}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data.data).to.have.property('recommendations');
    });

    it('should enforce authentication on protected endpoints', async () => {
      try {
        await axios.get(`${API_GATEWAY}/subscriptions/user/${userId}`);
        throw new Error('Should have failed without token');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });

    it('should provide health check', async () => {
      const response = await axios.get(`${API_GATEWAY}/health`);

      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status', 'ok');
      expect(response.data).to.have.property('service', 'API Gateway');
    });
  });
});

// ========================
// 7. COMPLETE BUSINESS FLOW TESTS
// ========================

describe('COMPLETE BUSINESS FLOW - End-to-End Integration', () => {
  
  let testContext = {};

  it('Complete User Journey: Register → Upload → Watch → Subscribe → Payment', async () => {
    console.log('\n========== COMPLETE USER JOURNEY ==========\n');

    // 1. User Registration
    console.log('1. User Registration...');
    const registerRes = await axios.post(`${API_GATEWAY}/auth/register`, {
      email: 'journey-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Journey',
      lastName: 'Test',
    });
    expect(registerRes.status).to.equal(201);
    testContext.userId = registerRes.data.data.id;
    console.log('   ✅ User registered successfully');

    // 2. Login
    console.log('2. User Login...');
    const loginRes = await axios.post(`${API_GATEWAY}/auth/login`, {
      email: 'journey-test@example.com',
      password: 'TestPassword123!',
    });
    expect(loginRes.status).to.equal(200);
    testContext.token = loginRes.data.data.accessToken;
    console.log('   ✅ User logged in successfully');

    // 3. Upload Video
    console.log('3. Video Upload...');
    const uploadInitRes = await axios.post(
      `${API_GATEWAY}/videos/upload/init`,
      {
        title: 'Journey Video',
        description: 'Test video',
        totalSize: 1024 * 1024 * 50,
        chunkSize: 1024 * 1024 * 5,
      },
      { headers: { Authorization: `Bearer ${testContext.token}` } }
    );
    expect(uploadInitRes.status).to.equal(201);
    testContext.videoId = uploadInitRes.data.data.videoId;
    console.log('   ✅ Video upload initiated');

    // 4. Get Recommendations
    console.log('4. Get Recommendations...');
    const recRes = await axios.get(
      `${API_GATEWAY}/recommendations/${testContext.userId}`,
      { headers: { Authorization: `Bearer ${testContext.token}` } }
    );
    expect(recRes.status).to.equal(200);
    console.log('   ✅ Recommendations retrieved');

    // 5. List Subscription Plans
    console.log('5. Subscription Plans...');
    const plansRes = await axios.get(
      `${API_GATEWAY}/subscriptions/plans`,
      { headers: { Authorization: `Bearer ${testContext.token}` } }
    );
    expect(plansRes.status).to.equal(200);
    const planId = plansRes.data.data[0].id;
    console.log('   ✅ Subscription plans retrieved');

    // 6. Create Subscription
    console.log('6. Create Subscription...');
    const subRes = await axios.post(
      `${API_GATEWAY}/subscriptions`,
      {
        userId: testContext.userId,
        planId,
      },
      { headers: { Authorization: `Bearer ${testContext.token}` } }
    );
    expect(subRes.status).to.equal(201);
    testContext.subscriptionId = subRes.data.data.id;
    console.log('   ✅ Subscription created');

    // 7. Process Payment
    console.log('7. Process Payment...');
    const paymentRes = await axios.post(
      `${API_GATEWAY}/payments/create`,
      {
        user_id: testContext.userId,
        amount: 9.99,
        description: 'Monthly subscription',
      },
      { headers: { Authorization: `Bearer ${testContext.token}` } }
    );
    expect(paymentRes.status).to.equal(201);
    console.log('   ✅ Payment processed');

    // 8. Verify Complete Flow
    console.log('8. Verify Complete Flow...');
    const profileRes = await axios.get(`${API_GATEWAY}/auth/me`, {
      headers: { Authorization: `Bearer ${testContext.token}` },
    });
    expect(profileRes.status).to.equal(200);
    console.log('   ✅ User profile verified');

    console.log('\n========== COMPLETE JOURNEY SUCCESS! ✅ ==========\n');
  });
});

module.exports = { TestContext, ctx };
