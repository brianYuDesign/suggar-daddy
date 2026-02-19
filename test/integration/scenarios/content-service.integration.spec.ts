/**
 * 內容服務整合測試
 * 測試 Content Service 與 Media Service 的整合
 */

import { TestEnvironment, TestClients } from '@test/setup';
import { TestHelpers, TestFixtures } from '@test/helpers';

describe('Content Service Integration Tests', () => {
  let contentClient: any;
  let mediaClient: any;
  let paymentClient: any;
  let authClient: any;
  let creatorToken: string;
  let creatorId: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    await TestEnvironment.setup();
    await TestClients.initialize();

    authClient = TestHelpers.createGatewayClient('auth');

    // 建立創作者
    const creatorData = TestFixtures.createCreator();
    const creatorResponse = await authClient.post('/api/auth/register', creatorData);
    creatorToken = creatorResponse.data.accessToken;
    creatorId = creatorResponse.data.user.id;

    // 建立一般使用者
    const userData = TestFixtures.createUser();
    const userResponse = await authClient.post('/api/auth/register', userData);
    userToken = userResponse.data.accessToken;
    userId = userResponse.data.user.id;

    contentClient = TestHelpers.createGatewayClient('content', creatorToken);
    mediaClient = TestHelpers.createGatewayClient('content', creatorToken); // media 通過 content 路徑
    paymentClient = TestHelpers.createGatewayClient('payment', userToken);
  }, 60000);

  afterAll(async () => {
    await TestClients.close();
    await TestEnvironment.cleanup();
  });

  beforeEach(async () => {
    await TestClients.clearDatabase();
    await TestClients.clearRedis();
  });

  describe('貼文創建流程', () => {
    it('應該建立文字貼文', async () => {
      // Arrange
      const postData = TestFixtures.createPost(creatorId);

      // Act
      const response = await contentClient.post('/posts', postData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data.title).toBe(postData.title);
      expect(response.data.authorId).toBe(creatorId);

      // 驗證資料庫
      const dataSource = TestClients.getDataSource();
      const postRepo = dataSource.getRepository('Post');
      const post = await postRepo.findOne({ where: { id: response.data.id } });

      expect(post).toBeTruthy();
      expect(post?.title).toBe(postData.title);
    });

    it('應該建立帶媒體的貼文', async () => {
      // Arrange - 先上傳媒體
      const mediaData = TestFixtures.createMedia(creatorId);
      const mediaResponse = await mediaClient.post('/media/upload', mediaData);
      const mediaId = mediaResponse.data.id;

      // Act - 建立貼文並關聯媒體
      const postData = TestFixtures.createPost(creatorId, {
        mediaIds: [mediaId],
      });

      const response = await contentClient.post('/posts', postData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.media).toHaveLength(1);
      expect(response.data.media[0].id).toBe(mediaId);
    });

    it('應該建立付費貼文', async () => {
      // Arrange
      const paidPostData = TestFixtures.createPaidPost(creatorId, 5.99);

      // Act
      const response = await contentClient.post('/posts', paidPostData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.isPaid).toBe(true);
      expect(response.data.price).toBe(5.99);
      expect(response.data.visibility).toBe('subscribers');
    });
  });

  describe('Media Service 整合', () => {
    it('應該上傳圖片', async () => {
      // Arrange
      const imageData = {
        type: 'image',
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 102400, // 100KB
        buffer: Buffer.from('fake-image-data'),
      };

      // Act
      const response = await mediaClient.post('/media/upload', imageData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('url');
      expect(response.data.type).toBe('image');
      expect(response.data.userId).toBe(creatorId);
    });

    it('應該上傳影片', async () => {
      // Arrange
      const videoData = {
        type: 'video',
        filename: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 5242880, // 5MB
        buffer: Buffer.from('fake-video-data'),
      };

      // Act
      const response = await mediaClient.post('/media/upload', videoData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.type).toBe('video');
      expect(response.data).toHaveProperty('thumbnailUrl');
    });

    it('應該拒絕過大的檔案', async () => {
      // Arrange - 超過限制的檔案大小
      const largeFileData = {
        type: 'video',
        filename: 'large-video.mp4',
        mimeType: 'video/mp4',
        size: 104857600, // 100MB
      };

      // Act & Assert
      await expect(
        mediaClient.post('/media/upload', largeFileData)
      ).rejects.toMatchObject({
        response: {
          status: 413, // Payload Too Large
        },
      });
    });

    it('應該處理媒體處理失敗', async () => {
      // Arrange - 無效的媒體資料
      const invalidData = {
        type: 'image',
        filename: 'corrupted.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('invalid-image-data'),
      };

      // Act & Assert
      await expect(
        mediaClient.post('/media/upload', invalidData)
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });
  });

  describe('貼文購買流程', () => {
    let paidPostId: string;

    beforeEach(async () => {
      // 建立付費貼文
      const paidPostData = TestFixtures.createPaidPost(creatorId, 9.99);
      const response = await contentClient.post('/posts', paidPostData);
      paidPostId = response.data.id;
    });

    it('應該完成完整的貼文購買流程', async () => {
      // Act - Step 1: 一般使用者請求購買貼文
      const userContentClient = TestHelpers.createHttpClient(
        'http://localhost:3006',
        userToken
      );

      // 驗證未購買前無法查看
      await expect(
        userContentClient.get(`/posts/${paidPostId}`)
      ).rejects.toMatchObject({
        response: {
          status: 403, // Forbidden
        },
      });

      // Step 2: 建立購買付款
      const userPaymentClient = TestHelpers.createHttpClient(
        'http://localhost:3007',
        userToken
      );

      const purchaseResponse = await userPaymentClient.post('/payment/post-purchase', {
        postId: paidPostId,
        amount: 9.99,
      });

      const paymentId = purchaseResponse.data.paymentId;

      // Step 3: 完成付款
      await userPaymentClient.post(`/payment/${paymentId}/complete`);

      // 等待事件處理
      await TestHelpers.sleep(2000);

      // Assert - 驗證可以查看貼文
      const postResponse = await userContentClient.get(`/posts/${paidPostId}`);
      expect(postResponse.status).toBe(200);
      expect(postResponse.data.id).toBe(paidPostId);
      expect(postResponse.data.content).toBeTruthy();

      // 驗證購買記錄
      const dataSource = TestClients.getDataSource();
      const purchaseRepo = dataSource.getRepository('PostPurchase');
      const purchase = await purchaseRepo.findOne({
        where: { userId, postId: paidPostId },
      });

      expect(purchase).toBeTruthy();
      expect(purchase?.amount).toBe(9.99);
      expect(purchase?.status).toBe('completed');
    });

    it('應該防止重複購買', async () => {
      // Arrange - 先購買一次
      const userPaymentClient = TestHelpers.createHttpClient(
        'http://localhost:3007',
        userToken
      );

      const firstPurchase = await userPaymentClient.post('/payment/post-purchase', {
        postId: paidPostId,
        amount: 9.99,
      });

      await userPaymentClient.post(`/payment/${firstPurchase.data.paymentId}/complete`);
      await TestHelpers.sleep(1000);

      // Act & Assert - 嘗試再次購買
      await expect(
        userPaymentClient.post('/payment/post-purchase', {
          postId: paidPostId,
          amount: 9.99,
        })
      ).rejects.toMatchObject({
        response: {
          status: 409, // Conflict
          data: expect.objectContaining({
            message: expect.stringContaining('already purchased'),
          }),
        },
      });
    });
  });

  describe('Redis 快取機制', () => {
    it('應該快取熱門貼文', async () => {
      // Arrange - 建立貼文
      const postData = TestFixtures.createPost(creatorId);
      const createResponse = await contentClient.post('/posts', postData);
      const postId = createResponse.data.id;

      // Act - 第一次請求（應該從資料庫）
      const firstResponse = await contentClient.get(`/posts/${postId}`);
      
      // 第二次請求（應該從快取）
      const secondResponse = await contentClient.get(`/posts/${postId}`);

      // Assert
      expect(firstResponse.data).toEqual(secondResponse.data);

      // 驗證 Redis 有快取
      const redis = TestClients.getRedis();
      const cacheKey = `post:${postId}`;
      const cachedData = await redis.get(cacheKey);

      expect(cachedData).toBeTruthy();
      const parsedCache = JSON.parse(cachedData!);
      expect(parsedCache.id).toBe(postId);
    });

    it('應該在貼文更新時清除快取', async () => {
      // Arrange - 建立並快取貼文
      const postData = TestFixtures.createPost(creatorId);
      const createResponse = await contentClient.post('/posts', postData);
      const postId = createResponse.data.id;

      await contentClient.get(`/posts/${postId}`); // 觸發快取

      // Act - 更新貼文
      await contentClient.patch(`/posts/${postId}`, {
        title: 'Updated Title',
      });

      // Assert - 驗證快取已清除
      const redis = TestClients.getRedis();
      const cacheKey = `post:${postId}`;
      const cachedData = await redis.get(cacheKey);

      expect(cachedData).toBeNull();

      // 再次請求應該取得更新後的資料
      const updatedResponse = await contentClient.get(`/posts/${postId}`);
      expect(updatedResponse.data.title).toBe('Updated Title');
    });

    it('應該快取使用者的貼文列表', async () => {
      // Arrange - 建立多個貼文
      await Promise.all([
        contentClient.post('/posts', TestFixtures.createPost(creatorId)),
        contentClient.post('/posts', TestFixtures.createPost(creatorId)),
        contentClient.post('/posts', TestFixtures.createPost(creatorId)),
      ]);

      // Act - 請求貼文列表
      const response = await contentClient.get(`/users/${creatorId}/posts`);

      // Assert
      expect(response.data.posts).toHaveLength(3);

      // 驗證列表快取
      const redis = TestClients.getRedis();
      const listCacheKey = `user:${creatorId}:posts`;
      const cachedList = await redis.get(listCacheKey);

      expect(cachedList).toBeTruthy();
    });

    it('應該設置快取過期時間', async () => {
      // Arrange
      const postData = TestFixtures.createPost(creatorId);
      const createResponse = await contentClient.post('/posts', postData);
      const postId = createResponse.data.id;

      // Act
      await contentClient.get(`/posts/${postId}`);

      // Assert - 檢查 TTL
      const redis = TestClients.getRedis();
      const cacheKey = `post:${postId}`;
      const ttl = await redis.ttl(cacheKey);

      expect(ttl).toBeGreaterThan(0); // 有設置過期時間
      expect(ttl).toBeLessThanOrEqual(3600); // 不超過 1 小時
    });
  });

  describe('內容權限控制', () => {
    it('應該限制非訂閱者查看訂閱內容', async () => {
      // Arrange - 建立訂閱者專屬貼文
      const subscriberPost = TestFixtures.createPost(creatorId, {
        visibility: 'subscribers',
      });
      const response = await contentClient.post('/posts', subscriberPost);
      const postId = response.data.id;

      // Act & Assert - 非訂閱者無法查看
      const userContentClient = TestHelpers.createHttpClient(
        'http://localhost:3006',
        userToken
      );

      await expect(
        userContentClient.get(`/posts/${postId}`)
      ).rejects.toMatchObject({
        response: {
          status: 403,
        },
      });
    });

    it('訂閱者應該能查看訂閱內容', async () => {
      // Arrange - 建立訂閱關係
      const dataSource = TestClients.getDataSource();
      const subscriptionRepo = dataSource.getRepository('Subscription');
      const subscription = TestFixtures.createSubscription(userId, creatorId);
      await subscriptionRepo.save(subscription);

      // 建立訂閱者專屬貼文
      const subscriberPost = TestFixtures.createPost(creatorId, {
        visibility: 'subscribers',
      });
      const response = await contentClient.post('/posts', subscriberPost);
      const postId = response.data.id;

      // Act - 訂閱者查看
      const userContentClient = TestHelpers.createHttpClient(
        'http://localhost:3006',
        userToken
      );

      const postResponse = await userContentClient.get(`/posts/${postId}`);

      // Assert
      expect(postResponse.status).toBe(200);
      expect(postResponse.data.id).toBe(postId);
    });
  });

  describe('效能測試', () => {
    it('應該能處理批次貼文建立', async () => {
      // Arrange
      const posts = Array.from({ length: 10 }, () =>
        TestFixtures.createPost(creatorId)
      );

      // Act
      const startTime = Date.now();
      const responses = await Promise.all(
        posts.map((post) => contentClient.post('/posts', post))
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(responses).toHaveLength(10);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // 應該在合理時間內完成（例如 5 秒）
      expect(duration).toBeLessThan(5000);
    });

    it('快取應該提升查詢效能', async () => {
      // Arrange - 建立貼文
      const postData = TestFixtures.createPost(creatorId);
      const createResponse = await contentClient.post('/posts', postData);
      const postId = createResponse.data.id;

      // Act - 第一次查詢（無快取）
      const firstStart = Date.now();
      await contentClient.get(`/posts/${postId}`);
      const firstDuration = Date.now() - firstStart;

      // 第二次查詢（有快取）
      const secondStart = Date.now();
      await contentClient.get(`/posts/${postId}`);
      const secondDuration = Date.now() - secondStart;

      // Assert - 快取查詢應該更快
      expect(secondDuration).toBeLessThan(firstDuration);
    });
  });
});
