/**
 * 認證服務整合測試
 * 測試 Auth Service 與 User Service 的整合
 */

import { TestEnvironment, TestClients } from '@test/setup';
import { TestHelpers, TestFixtures } from '@test/helpers';

describe('Auth Service Integration Tests', () => {
  let authClient: any;
  let userClient: any;

  beforeAll(async () => {
    // 啟動測試環境
    await TestEnvironment.setup();
    await TestClients.initialize();

    // 建立 HTTP 客戶端 - 使用 API Gateway
    authClient = TestHelpers.createGatewayClient('auth');
    userClient = TestHelpers.createGatewayClient('user');
  }, 60000);

  afterAll(async () => {
    await TestClients.close();
    await TestEnvironment.cleanup();
  });

  beforeEach(async () => {
    // 清空資料
    await TestClients.clearDatabase();
    await TestClients.clearRedis();
  });

  describe('使用者註冊流程', () => {
    it('應該成功註冊新使用者並建立 User Service 記錄', async () => {
      // Arrange
      const userData = TestFixtures.createUser();

      // Act - 註冊使用者
      const registerResponse = await authClient.post('/auth/register', userData);

      // Assert - 驗證註冊回應
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.data).toHaveProperty('user');
      expect(registerResponse.data).toHaveProperty('accessToken');
      expect(registerResponse.data.user.email).toBe(userData.email);

      const userId = registerResponse.data.user.id;
      const token = registerResponse.data.accessToken;

      // 等待 User Service 建立使用者記錄
      await TestHelpers.sleep(1000);

      // Act - 從 User Service 取得使用者
      const userResponse = await TestHelpers.createHttpClient(
        'http://localhost:3001',
        token
      ).get(`/users/${userId}`);

      // Assert - 驗證 User Service 有使用者記錄
      expect(userResponse.status).toBe(200);
      expect(userResponse.data.id).toBe(userId);
      expect(userResponse.data.email).toBe(userData.email);
    });

    it('應該防止重複的郵箱註冊', async () => {
      // Arrange
      const userData = TestFixtures.createUser();

      // Act - 第一次註冊
      await authClient.post('/auth/register', userData);

      // Act & Assert - 第二次註冊應該失敗
      await expect(
        authClient.post('/auth/register', userData)
      ).rejects.toMatchObject({
        response: {
          status: 409,
          data: expect.objectContaining({
            message: expect.stringContaining('already exists'),
          }),
        },
      });
    });
  });

  describe('使用者登入流程', () => {
    it('應該使用正確的憑證登入', async () => {
      // Arrange - 建立使用者
      const userData = TestFixtures.createUser();
      await authClient.post('/auth/register', userData);

      // Act - 登入
      const loginResponse = await authClient.post('/login', {
        email: userData.email,
        password: userData.password,
      });

      // Assert
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty('accessToken');
      expect(loginResponse.data).toHaveProperty('refreshToken');
      expect(loginResponse.data.user.email).toBe(userData.email);

      // 驗證 Token 格式
      const decoded = TestHelpers.decodeToken(loginResponse.data.accessToken);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
    });

    it('應該拒絕錯誤的密碼', async () => {
      // Arrange
      const userData = TestFixtures.createUser();
      await authClient.post('/auth/register', userData);

      // Act & Assert
      await expect(
        authClient.post('/login', {
          email: userData.email,
          password: 'WrongPassword123!',
        })
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('應該將 Session 資訊儲存到 Redis', async () => {suggar_daddy
      // Arrange
      const userData = TestFixtures.createUser();
      const registerResponse = await authClient.post('/auth/register', userData);
      const userId = registerResponse.data.user.id;

      // Act - 登入
      const loginResponse = await authClient.post('/login', {
        email: userData.email,
        password: userData.password,
      });

      // Assert - 檢查 Redis
      const redis = TestClients.getRedis();
      const sessionKey = `session:${userId}`;
      
      const sessionData = await TestHelpers.waitForRedisKey(redis, sessionKey);
      expect(sessionData).toBeTruthy();

      const session = JSON.parse(sessionData!);
      expect(session).toHaveProperty('userId', userId);
      expect(session).toHaveProperty('email', userData.email);
    });
  });

  describe('JWT Token 驗證', () => {
    it('應該使用有效的 Token 驗證請求', async () => {
      // Arrange - 註冊並登入
      const userData = TestFixtures.createUser();
      const registerResponse = await authClient.post('/auth/register', userData);
      const token = registerResponse.data.accessToken;

      // Act - 使用 Token 請求受保護的路由
      const profileResponse = await TestHelpers.createHttpClient(
        'http://localhost:3002',
        token
      ).get('/auth/profile');

      // Assert
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.email).toBe(userData.email);
    });

    it('應該拒絕無效的 Token', async () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token';

      // Act & Assert
      await expect(
        TestHelpers.createGatewayClient('auth', invalidToken).get(
          '/profile'
        )
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });

    it('應該拒絕過期的 Token', async () => {
      // Arrange - 建立過期的 Token
      const expiredToken = TestHelpers.generateToken(
        { userId: '123', email: 'test@example.com' },
        'test-jwt-secret',
        '-1h' // 過期 1 小時
      );

      // Act & Assert
      await expect(
        TestHelpers.createGatewayClient('auth', expiredToken).get(
          '/profile'
        )
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });
  });

  describe('Token 刷新流程', () => {
    it('應該使用 Refresh Token 取得新的 Access Token', async () => {
      // Arrange - 註冊並登入
      const userData = TestFixtures.createUser();
      const loginResponse = await authClient.post('/login', {
        email: userData.email,
        password: userData.password,
      });

      const refreshToken = loginResponse.data.refreshToken;

      // Act - 刷新 Token
      const refreshResponse = await authClient.post('/auth/refresh', {
        refreshToken,
      });

      // Assert
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.data).toHaveProperty('accessToken');
      expect(refreshResponse.data).toHaveProperty('refreshToken');

      // 驗證新 Token 可以使用
      const profileResponse = await TestHelpers.createHttpClient(
        'http://localhost:3002',
        refreshResponse.data.accessToken
      ).get('/auth/profile');

      expect(profileResponse.status).toBe(200);
    });
  });

  describe('登出流程', () => {
    it('應該清除 Session 並使 Token 失效', async () => {
      // Arrange - 註冊並登入
      const userData = TestFixtures.createUser();
      const registerResponse = await authClient.post('/auth/register', userData);
      const token = registerResponse.data.accessToken;
      const userId = registerResponse.data.user.id;

      // Act - 登出
      const logoutResponse = await TestHelpers.createHttpClient(
        'http://localhost:3002',
        token
      ).post('/auth/logout');

      // Assert
      expect(logoutResponse.status).toBe(200);

      // 驗證 Session 已清除
      const redis = TestClients.getRedis();
      const sessionKey = `session:${userId}`;
      const session = await redis.get(sessionKey);
      expect(session).toBeNull();

      // 驗證 Token 已失效
      await expect(
        TestHelpers.createGatewayClient('auth', token).get(
          '/profile'
        )
      ).rejects.toMatchObject({
        response: {
          status: 401,
        },
      });
    });
  });

  describe('API Gateway 路由整合', () => {
    it('應該通過 API Gateway 路由到 Auth Service', async () => {
      // Arrange
      const gatewayClient = TestHelpers.createGatewayClient();
      const userData = TestFixtures.createUser();

      // Act - 通過 Gateway 註冊
      const response = await gatewayClient.post('/api/auth/register', userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('accessToken');
    });

    it('API Gateway 應該驗證 JWT Token', async () => {
      // Arrange - 註冊使用者
      const gatewayClient = TestHelpers.createGatewayClient();
      const userData = TestFixtures.createUser();
      const registerResponse = await gatewayClient.post(
        '/api/auth/register',
        userData
      );
      const token = registerResponse.data.accessToken;

      // Act - 通過 Gateway 訪問受保護的路由
      const profileResponse = await TestHelpers.createGatewayClient(
        undefined,
        token
      ).get('/api/auth/profile');

      // Assert
      expect(profileResponse.status).toBe(200);
      expect(profileResponse.data.email).toBe(userData.email);
    });
  });
});
