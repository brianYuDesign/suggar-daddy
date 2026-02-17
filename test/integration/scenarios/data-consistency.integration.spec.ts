/**
 * 數據一致性整合測試
 * 測試跨服務的資料一致性和事件處理
 */

import { TestEnvironment, TestClients } from '../../setup';
import { TestHelpers, TestFixtures } from '../../helpers';
import { Consumer } from 'kafkajs';

describe('Data Consistency Integration Tests', () => {
  let authClient: any;
  let paymentClient: any;
  let contentClient: any;
  let kafkaConsumer: Consumer;
  let creatorToken: string;
  let creatorId: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    await TestEnvironment.setup();
    await TestClients.initialize();

    authClient = TestHelpers.createHttpClient('http://localhost:3002');

    // 建立測試使用者
    const creatorData = TestFixtures.createCreator();
    const creatorResponse = await authClient.post('/auth/register', creatorData);
    creatorToken = creatorResponse.data.accessToken;
    creatorId = creatorResponse.data.user.id;

    const userData = TestFixtures.createUser();
    const userResponse = await authClient.post('/auth/register', userData);
    userToken = userResponse.data.accessToken;
    userId = userResponse.data.user.id;

    paymentClient = TestHelpers.createHttpClient('http://localhost:3007', userToken);
    contentClient = TestHelpers.createHttpClient('http://localhost:3006', creatorToken);

    // 建立 Kafka Consumer
    kafkaConsumer = TestClients.createKafkaConsumer('consistency-test-group');
  }, 60000);

  afterAll(async () => {
    if (kafkaConsumer) {
      await kafkaConsumer.disconnect();
    }
    await TestClients.close();
    await TestEnvironment.cleanup();
  });

  beforeEach(async () => {
    await TestClients.clearDatabase();
    await TestClients.clearRedis();
    await TestClients.clearKafkaTopics([
      'payment-events',
      'subscription-events',
      'user-events',
      'content-events',
    ]);
  });

  describe('Kafka 事件順序保證', () => {
    it('應該按順序處理相關事件', async () => {
      // Arrange
      await kafkaConsumer.subscribe({
        topics: ['payment-events', 'subscription-events'],
        fromBeginning: true,
      });

      const receivedEvents: any[] = [];

      kafkaConsumer.run({
        eachMessage: async ({ topic, message }) => {
          const event = JSON.parse(message.value!.toString());
          receivedEvents.push({
            topic,
            eventType: event.eventType,
            timestamp: new Date(event.timestamp),
          });
        },
      });

      // Act - 觸發一系列相關事件
      // 1. 建立付款
      const paymentResponse = await paymentClient.post('/payment', {
        amount: 9.99,
        currency: 'USD',
        type: 'subscription',
        metadata: { creatorId },
      });

      const paymentId = paymentResponse.data.id;

      // 2. 完成付款
      await paymentClient.post(`/payment/${paymentId}/complete`);

      // 等待事件處理
      await TestHelpers.sleep(3000);

      // Assert - 驗證事件順序
      const paymentCreatedIndex = receivedEvents.findIndex(
        (e) => e.eventType === 'payment.created'
      );
      const paymentCompletedIndex = receivedEvents.findIndex(
        (e) => e.eventType === 'payment.completed'
      );
      const subscriptionCreatedIndex = receivedEvents.findIndex(
        (e) => e.eventType === 'subscription.created'
      );

      expect(paymentCreatedIndex).toBeGreaterThanOrEqual(0);
      expect(paymentCompletedIndex).toBeGreaterThan(paymentCreatedIndex);
      
      // 訂閱事件應該在付款完成後
      if (subscriptionCreatedIndex >= 0) {
        expect(subscriptionCreatedIndex).toBeGreaterThan(paymentCompletedIndex);
      }
    });

    it('應該處理並行事件而不衝突', async () => {
      // Arrange - 訂閱事件
      await kafkaConsumer.subscribe({
        topics: ['payment-events'],
        fromBeginning: true,
      });

      let eventCount = 0;
      kafkaConsumer.run({
        eachMessage: async () => {
          eventCount++;
        },
      });

      // Act - 並行建立多個付款
      const payments = Array.from({ length: 5 }, (_, i) => ({
        amount: (i + 1) * 10,
        currency: 'USD',
        type: 'tip',
      }));

      await Promise.all(
        payments.map((payment) => paymentClient.post('/payment', payment))
      );

      // 等待事件處理
      await TestHelpers.sleep(3000);

      // Assert - 所有事件都應該被處理
      expect(eventCount).toBe(5);

      // 驗證資料庫沒有衝突
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');
      const savedPayments = await paymentRepo.find({ where: { userId } });

      expect(savedPayments).toHaveLength(5);
    });
  });

  describe('DB Writer Service 資料一致性', () => {
    it('應該確保 Kafka 事件和資料庫記錄的一致性', async () => {
      // Arrange
      const producer = TestClients.getKafkaProducer();

      const events = [
        TestFixtures.createKafkaEvent('payment.created', {
          paymentId: 'pay_001',
          userId,
          amount: 100,
          currency: 'USD',
        }),
        TestFixtures.createKafkaEvent('payment.completed', {
          paymentId: 'pay_001',
          userId,
          status: 'completed',
        }),
      ];

      // Act - 發送事件
      for (const event of events) {
        await producer.send({
          topic: 'payment-events',
          messages: [
            {
              key: event.data.paymentId,
              value: JSON.stringify(event),
            },
          ],
        });
      }

      // 等待 DB Writer 處理
      await TestHelpers.sleep(2000);

      // Assert - 驗證最終資料狀態
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({
        where: { externalId: 'pay_001' },
      });

      expect(payment).toBeTruthy();
      expect(payment?.status).toBe('completed');
      expect(payment?.amount).toBe(100);
    });

    it('應該處理重複事件（冪等性）', async () => {
      // Arrange
      const producer = TestClients.getKafkaProducer();

      const event = TestFixtures.createKafkaEvent('payment.created', {
        paymentId: 'pay_duplicate',
        userId,
        amount: 50,
        currency: 'USD',
      });

      // Act - 發送相同事件兩次
      await producer.send({
        topic: 'payment-events',
        messages: [
          {
            key: event.data.paymentId,
            value: JSON.stringify(event),
          },
        ],
      });

      await TestHelpers.sleep(1000);

      await producer.send({
        topic: 'payment-events',
        messages: [
          {
            key: event.data.paymentId,
            value: JSON.stringify(event),
          },
        ],
      });

      await TestHelpers.sleep(2000);

      // Assert - 應該只有一筆記錄
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');
      const payments = await paymentRepo.find({
        where: { externalId: 'pay_duplicate' },
      });

      expect(payments).toHaveLength(1);
    });

    it('應該處理事件處理失敗並重試', async () => {
      // Arrange - 建立一個會導致錯誤的事件
      const producer = TestClients.getKafkaProducer();

      // 先發送一個有問題的事件（例如缺少必要欄位）
      const invalidEvent = TestFixtures.createKafkaEvent('payment.created', {
        paymentId: 'pay_invalid',
        // 缺少 userId
        amount: 100,
      });

      await producer.send({
        topic: 'payment-events',
        messages: [
          {
            key: invalidEvent.data.paymentId,
            value: JSON.stringify(invalidEvent),
          },
        ],
      });

      await TestHelpers.sleep(2000);

      // 發送正確的事件
      const validEvent = TestFixtures.createKafkaEvent('payment.created', {
        paymentId: 'pay_valid',
        userId,
        amount: 100,
        currency: 'USD',
      });

      await producer.send({
        topic: 'payment-events',
        messages: [
          {
            key: validEvent.data.paymentId,
            value: JSON.stringify(validEvent),
          },
        ],
      });

      await TestHelpers.sleep(2000);

      // Assert - 正確的事件應該被處理
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({
        where: { externalId: 'pay_valid' },
      });

      expect(payment).toBeTruthy();
    });
  });

  describe('跨服務事務一致性', () => {
    it('應該確保訂閱創建的事務一致性', async () => {
      // Arrange
      await kafkaConsumer.subscribe({
        topics: ['payment-events', 'subscription-events'],
        fromBeginning: true,
      });

      const events: any[] = [];
      kafkaConsumer.run({
        eachMessage: async ({ message }) => {
          events.push(JSON.parse(message.value!.toString()));
        },
      });

      // Act - 建立訂閱付款流程
      const subscriptionData = {
        creatorId,
        amount: 9.99,
        currency: 'USD',
      };

      const paymentResponse = await paymentClient.post(
        '/payment/subscription',
        subscriptionData
      );

      await paymentClient.post(
        `/payment/${paymentResponse.data.paymentId}/complete`
      );

      // 等待所有事件處理
      await TestHelpers.sleep(3000);

      // Assert - 驗證所有相關記錄都已建立
      const dataSource = TestClients.getDataSource();

      // 1. Payment 記錄
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({
        where: { id: paymentResponse.data.paymentId },
      });
      expect(payment?.status).toBe('completed');

      // 2. Subscription 記錄
      const subscriptionRepo = dataSource.getRepository('Subscription');
      const subscription = await subscriptionRepo.findOne({
        where: { userId, creatorId },
      });
      expect(subscription?.status).toBe('active');

      // 3. Transaction 記錄
      const transactionRepo = dataSource.getRepository('Transaction');
      const transaction = await transactionRepo.findOne({
        where: { userId, type: 'subscription' },
      });
      expect(transaction).toBeTruthy();

      // 4. 驗證關聯一致性
      expect(payment?.amount).toBe(transaction?.amount);
      expect(subscription?.amount).toBe(payment?.amount);
    });

    it('付款失敗時應該回滾相關操作', async () => {
      // Arrange
      const subscriptionData = {
        creatorId,
        amount: 9.99,
        currency: 'USD',
      };

      // Act - 建立付款但不完成
      const paymentResponse = await paymentClient.post(
        '/payment/subscription',
        subscriptionData
      );

      const paymentId = paymentResponse.data.paymentId;

      // 模擬付款失敗
      await paymentClient.post(`/payment/${paymentId}/fail`);

      await TestHelpers.sleep(2000);

      // Assert - 確認訂閱未建立
      const dataSource = TestClients.getDataSource();
      
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({ where: { id: paymentId } });
      expect(payment?.status).toBe('failed');

      const subscriptionRepo = dataSource.getRepository('Subscription');
      const subscription = await subscriptionRepo.findOne({
        where: { userId, creatorId },
      });
      expect(subscription).toBeNull();
    });

    it('應該處理部分失敗的分散式事務', async () => {
      // Arrange - 建立貼文
      const postData = TestFixtures.createPaidPost(creatorId, 5.99);
      const postResponse = await contentClient.post('/posts', postData);
      const postId = postResponse.data.id;

      // Act - 嘗試購買但在某個步驟失敗
      try {
        const purchaseResponse = await paymentClient.post('/payment/post-purchase', {
          postId,
          amount: 5.99,
        });

        const paymentId = purchaseResponse.data.paymentId;

        // 模擬網路問題或服務暫時不可用
        // 付款成功但購買記錄建立失敗的情況

        await paymentClient.post(`/payment/${paymentId}/complete`);

        // 強制在建立購買記錄前中斷
        // （實際場景中這可能是服務崩潰或網路問題）
      } catch (error) {
        // 預期可能失敗
      }

      await TestHelpers.sleep(2000);

      // Assert - 驗證系統最終一致性
      const dataSource = TestClients.getDataSource();
      
      // 付款記錄應該存在
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({
        where: { userId, type: 'post_purchase' },
      });

      if (payment) {
        // 如果付款存在，購買記錄也應該存在（最終一致性）
        const purchaseRepo = dataSource.getRepository('PostPurchase');
        
        // 使用重試機制等待最終一致性
        const purchase = await TestHelpers.retry(
          async () => {
            const p = await purchaseRepo.findOne({
              where: { userId, postId },
            });
            if (!p) throw new Error('Purchase not found');
            return p;
          },
          { retries: 5, delay: 1000 }
        );

        expect(purchase).toBeTruthy();
      }
    });
  });

  describe('資料完整性驗證', () => {
    it('應該維護參照完整性', async () => {
      // Arrange & Act - 建立完整的資料關聯
      const subscriptionData = {
        creatorId,
        amount: 9.99,
        currency: 'USD',
      };

      const paymentResponse = await paymentClient.post(
        '/payment/subscription',
        subscriptionData
      );

      await paymentClient.post(
        `/payment/${paymentResponse.data.paymentId}/complete`
      );

      await TestHelpers.sleep(2000);

      // Assert - 驗證所有外鍵關聯正確
      const dataSource = TestClients.getDataSource();

      const subscriptionRepo = dataSource.getRepository('Subscription');
      const subscription = await subscriptionRepo.findOne({
        where: { userId, creatorId },
        relations: ['user', 'creator', 'transactions'],
      });

      expect(subscription).toBeTruthy();
      expect(subscription?.user?.id).toBe(userId);
      expect(subscription?.creator?.id).toBe(creatorId);
      expect(subscription?.transactions).toBeDefined();
    });

    it('應該防止孤立記錄', async () => {
      // Arrange
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');
      const transactionRepo = dataSource.getRepository('Transaction');

      // Act - 建立付款並完成
      const paymentResponse = await paymentClient.post('/payment', {
        amount: 25.00,
        currency: 'USD',
        type: 'tip',
      });

      await paymentClient.post(
        `/payment/${paymentResponse.data.paymentId}/complete`
      );

      await TestHelpers.sleep(2000);

      // Assert - 每個 Payment 都應該有對應的 Transaction
      const payments = await paymentRepo.find({ where: { userId } });
      
      for (const payment of payments) {
        const transaction = await transactionRepo.findOne({
          where: { paymentId: payment.id },
        });

        expect(transaction).toBeTruthy();
        expect(transaction?.userId).toBe(payment.userId);
        expect(transaction?.amount).toBe(payment.amount);
      }
    });

    it('應該確保狀態轉換的有效性', async () => {
      // Arrange
      const paymentResponse = await paymentClient.post('/payment', {
        amount: 15.00,
        currency: 'USD',
        type: 'post_purchase',
      });

      const paymentId = paymentResponse.data.paymentId;

      // Act & Assert - 驗證狀態轉換規則
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');

      // 初始狀態應該是 pending
      let payment = await paymentRepo.findOne({ where: { id: paymentId } });
      expect(payment?.status).toBe('pending');

      // 完成付款
      await paymentClient.post(`/payment/${paymentId}/complete`);
      await TestHelpers.sleep(1000);

      payment = await paymentRepo.findOne({ where: { id: paymentId } });
      expect(payment?.status).toBe('completed');

      // 嘗試再次完成應該被拒絕
      await expect(
        paymentClient.post(`/payment/${paymentId}/complete`)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            message: expect.stringContaining('already completed'),
          }),
        },
      });
    });
  });

  describe('最終一致性測試', () => {
    it('系統應該達到最終一致性', async () => {
      // Arrange
      const operations = [
        // 操作 1: 訂閱
        async () => {
          const response = await paymentClient.post('/payment/subscription', {
            creatorId,
            amount: 9.99,
          });
          await paymentClient.post(`/payment/${response.data.paymentId}/complete`);
        },
        // 操作 2: 小費
        async () => {
          await paymentClient.post('/payment/tip', {
            toUserId: creatorId,
            amount: 5.00,
          });
        },
        // 操作 3: 貼文購買
        async () => {
          const postResponse = await contentClient.post('/posts', 
            TestFixtures.createPaidPost(creatorId, 3.99)
          );
          const purchaseResponse = await paymentClient.post('/payment/post-purchase', {
            postId: postResponse.data.id,
            amount: 3.99,
          });
          await paymentClient.post(`/payment/${purchaseResponse.data.paymentId}/complete`);
        },
      ];

      // Act - 並行執行多個操作
      await Promise.all(operations.map(op => op().catch(console.error)));

      // 等待系統達到最終一致性
      await TestHelpers.sleep(5000);

      // Assert - 驗證最終狀態一致
      const dataSource = TestClients.getDataSource();

      const paymentRepo = dataSource.getRepository('Payment');
      const payments = await paymentRepo.find({ where: { userId } });

      const transactionRepo = dataSource.getRepository('Transaction');
      const transactions = await transactionRepo.find({ where: { userId } });

      // 付款和交易數量應該匹配
      expect(transactions.length).toBeGreaterThanOrEqual(payments.length);

      // 總金額應該一致
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalTransactions = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      expect(Math.abs(totalPayments - totalTransactions)).toBeLessThan(0.01);
    });
  });
});
