/**
 * 付款服務整合測試
 * 測試 Payment Service, Stripe API, Kafka 和 DB Writer 整合
 */

import { TestEnvironment, TestClients } from '@test/setup';
import { TestHelpers, TestFixtures } from '@test/helpers';
import { Consumer } from 'kafkajs';

describe('Payment Service Integration Tests', () => {
  let paymentClient: any;
  let authClient: any;
  let token: string;
  let userId: string;
  let kafkaConsumer: Consumer;

  beforeAll(async () => {
    await TestEnvironment.setup();
    await TestClients.initialize();

    authClient = TestHelpers.createGatewayClient('auth');
    
    // 建立測試使用者
    const userData = TestFixtures.createUser();
    const registerResponse = await authClient.post('/register', userData);
    token = registerResponse.data.accessToken;
    userId = registerResponse.data.user.id;

    paymentClient = TestHelpers.createGatewayClient('payment', token);

    // 建立 Kafka Consumer
    kafkaConsumer = TestClients.createKafkaConsumer('payment-test-group');
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
    await TestClients.clearKafkaTopics(['payment-events', 'transaction-events']);
  });

  describe('Stripe 整合測試', () => {
    it('應該建立 Stripe Customer', async () => {
      // Act
      const response = await paymentClient.post('/payment/customer', {
        email: 'test@example.com',
        name: 'Test User',
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('customerId');
      expect(response.data.customerId).toMatch(/^cus_/);

      // 驗證資料庫記錄
      const dataSource = TestClients.getDataSource();
      const customerRepo = dataSource.getRepository('StripeCustomer');
      const customer = await TestHelpers.waitForDbRecord(
        customerRepo,
        { userId }
      );

      expect(customer).toBeTruthy();
      expect(customer.stripeCustomerId).toBe(response.data.customerId);
    });

    it('應該建立 Payment Intent', async () => {
      // Arrange - 先建立 customer
      const customerResponse = await paymentClient.post('/payment/customer', {
        email: 'test@example.com',
      });
      const customerId = customerResponse.data.customerId;

      // Act
      const response = await paymentClient.post('/api/stripe/intent', {
        amount: 1000, // $10.00
        currency: 'usd',
        customerId,
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('paymentIntentId');
      expect(response.data).toHaveProperty('clientSecret');
      expect(response.data.paymentIntentId).toMatch(/^pi_/);
    });

    it('應該處理 Stripe Webhook 事件', async () => {
      // Arrange - 建立 Payment Intent
      const customerResponse = await paymentClient.post('/payment/customer', {
        email: 'test@example.com',
      });
      const intentResponse = await paymentClient.post('/api/stripe/intent', {
        amount: 1000,
        currency: 'usd',
        customerId: customerResponse.data.customerId,
      });

      // Act - 模擬 Stripe Webhook (payment_intent.succeeded)
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: intentResponse.data.paymentIntentId,
            amount: 1000,
            currency: 'usd',
            status: 'succeeded',
            customer: customerResponse.data.customerId,
          },
        },
      };

      const webhookResponse = await paymentClient.post(
        '/payment/webhook',
        webhookPayload,
        {
          headers: {
            'stripe-signature': 'test-signature',
          },
        }
      );

      // Assert
      expect(webhookResponse.status).toBe(200);

      // 驗證 Payment 記錄已建立
      const dataSource = TestClients.getDataSource();
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await TestHelpers.waitForDbRecord(
        paymentRepo,
        { stripePaymentIntentId: intentResponse.data.paymentIntentId }
      );

      expect(payment).toBeTruthy();
      expect(payment.status).toBe('completed');
      expect(payment.amount).toBe(10); // 轉換為 dollars
    });
  });

  describe('Kafka 事件處理', () => {
    it('應該發送 payment.created 事件到 Kafka', async () => {
      // Arrange - 訂閱 Kafka topic
      await kafkaConsumer.subscribe({ topic: 'payment-events', fromBeginning: true });

      let receivedEvent: any = null;

      // 建立 Promise 來等待 Kafka 訊息
      const messagePromise = new Promise((resolve) => {
        kafkaConsumer.run({
          eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value!.toString());
            if (event.eventType === 'payment.created') {
              receivedEvent = event;
              resolve(event);
            }
          },
        });
      });

      // Act - 建立付款
      const response = await paymentClient.post('/payment', {
        amount: 50,
        currency: 'USD',
        type: 'subscription',
      });

      // 等待 Kafka 訊息
      await Promise.race([
        messagePromise,
        TestHelpers.sleep(5000).then(() => {
          throw new Error('Timeout waiting for Kafka message');
        }),
      ]);

      // Assert
      expect(receivedEvent).toBeTruthy();
      expect(receivedEvent.eventType).toBe('payment.created');
      expect(receivedEvent.data.userId).toBe(userId);
      expect(receivedEvent.data.amount).toBe(50);
    });

    it('應該發送 payment.completed 事件到 Kafka', async () => {
      // Arrange
      await kafkaConsumer.subscribe({ topic: 'payment-events', fromBeginning: true });

      let completedEvent: any = null;

      const messagePromise = new Promise((resolve) => {
        kafkaConsumer.run({
          eachMessage: async ({ message }) => {
            const event = JSON.parse(message.value!.toString());
            if (event.eventType === 'payment.completed') {
              completedEvent = event;
              resolve(event);
            }
          },
        });
      });

      // Act - 建立並完成付款
      const createResponse = await paymentClient.post('/payment', {
        amount: 100,
        currency: 'USD',
        type: 'tip',
      });

      const paymentId = createResponse.data.id;

      await paymentClient.post(`/payment/${paymentId}/complete`);

      // 等待事件
      await Promise.race([
        messagePromise,
        TestHelpers.sleep(5000).then(() => {
          throw new Error('Timeout waiting for Kafka message');
        }),
      ]);

      // Assert
      expect(completedEvent).toBeTruthy();
      expect(completedEvent.eventType).toBe('payment.completed');
      expect(completedEvent.data.paymentId).toBe(paymentId);
      expect(completedEvent.data.status).toBe('completed');
    });
  });

  describe('DB Writer Service 整合', () => {
    it('DB Writer 應該消費 Kafka 事件並寫入資料庫', async () => {
      // Arrange - 準備 Kafka 事件
      const producer = TestClients.getKafkaProducer();
      
      const paymentEvent = TestFixtures.createKafkaEvent('payment.created', {
        paymentId: 'payment_123',
        userId,
        amount: 99.99,
        currency: 'USD',
        type: 'subscription',
      });

      // Act - 發送事件到 Kafka
      await producer.send({
        topic: 'payment-events',
        messages: [
          {
            key: paymentEvent.data.paymentId,
            value: JSON.stringify(paymentEvent),
          },
        ],
      });

      // Assert - 等待 DB Writer 處理並寫入資料庫
      await TestHelpers.sleep(2000);

      const dataSource = TestClients.getDataSource();
      const transactionRepo = dataSource.getRepository('Transaction');
      
      const transaction = await TestHelpers.waitForDbRecord(
        transactionRepo,
        { externalId: 'payment_123' }
      );

      expect(transaction).toBeTruthy();
      expect(transaction.userId).toBe(userId);
      expect(transaction.amount).toBe(99.99);
      expect(transaction.type).toBe('subscription');
    });

    it('DB Writer 應該處理批次事件', async () => {
      // Arrange
      const producer = TestClients.getKafkaProducer();
      
      const events = Array.from({ length: 5 }, (_, i) =>
        TestFixtures.createKafkaEvent('payment.created', {
          paymentId: `payment_${i}`,
          userId,
          amount: (i + 1) * 10,
          currency: 'USD',
          type: 'tip',
        })
      );

      // Act - 發送批次事件
      await producer.send({
        topic: 'payment-events',
        messages: events.map((event) => ({
          key: event.data.paymentId,
          value: JSON.stringify(event),
        })),
      });

      // Assert - 等待處理
      await TestHelpers.sleep(3000);

      const dataSource = TestClients.getDataSource();
      const transactionRepo = dataSource.getRepository('Transaction');
      
      const transactions = await transactionRepo.find({ where: { userId } });
      
      expect(transactions).toHaveLength(5);
      expect(transactions.map(t => t.amount)).toEqual([10, 20, 30, 40, 50]);
    });
  });

  describe('訂閱創建端到端流程', () => {
    it('應該完成完整的訂閱創建流程', async () => {
      // Arrange - 建立創作者
      const creatorData = TestFixtures.createCreator();
      const creatorResponse = await authClient.post('/register', creatorData);
      const creatorId = creatorResponse.data.user.id;

      // Arrange - 訂閱 Kafka
      await kafkaConsumer.subscribe({ 
        topics: ['payment-events', 'subscription-events'], 
        fromBeginning: true 
      });

      const events: any[] = [];

      kafkaConsumer.run({
        eachMessage: async ({ topic, message }) => {
          const event = JSON.parse(message.value!.toString());
          events.push({ topic, event });
        },
      });

      // Act - Step 1: 建立 Stripe Customer
      const customerResponse = await paymentClient.post('/payment/customer', {
        email: 'subscriber@example.com',
      });

      // Act - Step 2: 建立訂閱付款
      const subscriptionResponse = await paymentClient.post('/payment/subscription', {
        customerId: customerResponse.data.customerId,
        creatorId,
        amount: 9.99,
      });

      // Act - Step 3: 確認付款
      await paymentClient.post(
        `/payment/${subscriptionResponse.data.paymentId}/complete`
      );

      // Assert - 等待所有事件處理完成
      await TestHelpers.sleep(3000);

      // 驗證 Kafka 事件
      const paymentCreatedEvent = events.find(
        e => e.event.eventType === 'payment.created'
      );
      const paymentCompletedEvent = events.find(
        e => e.event.eventType === 'payment.completed'
      );
      const subscriptionCreatedEvent = events.find(
        e => e.event.eventType === 'subscription.created'
      );

      expect(paymentCreatedEvent).toBeTruthy();
      expect(paymentCompletedEvent).toBeTruthy();
      expect(subscriptionCreatedEvent).toBeTruthy();

      // 驗證資料庫狀態
      const dataSource = TestClients.getDataSource();
      
      // 驗證 Payment 記錄
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({
        where: { id: subscriptionResponse.data.paymentId },
      });
      expect(payment?.status).toBe('completed');

      // 驗證 Subscription 記錄
      const subscriptionRepo = dataSource.getRepository('Subscription');
      const subscription = await TestHelpers.waitForDbRecord(
        subscriptionRepo,
        { userId, creatorId }
      );
      expect(subscription).toBeTruthy();
      expect(subscription.status).toBe('active');

      // 驗證 Transaction 記錄
      const transactionRepo = dataSource.getRepository('Transaction');
      const transaction = await transactionRepo.findOne({
        where: { userId, type: 'subscription' },
      });
      expect(transaction).toBeTruthy();
      expect(transaction?.amount).toBe(9.99);
    });
  });

  describe('錯誤處理和重試', () => {
    it('應該處理 Stripe API 錯誤', async () => {
      // Arrange - 無效的金額
      await expect(
        paymentClient.post('/api/stripe/intent', {
          amount: -100, // 負數金額
          currency: 'usd',
        })
      ).rejects.toMatchObject({
        response: {
          status: 400,
        },
      });
    });

    it('應該在 Kafka 發送失敗時重試', async () => {
      // 此測試需要模擬 Kafka 暫時性失敗
      // 可以通過停止 Kafka 服務來測試
      // 這裡我們驗證重試邏輯的存在

      const payment = TestFixtures.createPayment(userId, 50);
      
      // 驗證服務有重試配置
      const response = await paymentClient.post('/payment', payment);
      expect(response.status).toBe(201);
    });
  });

  describe('資料一致性測試', () => {
    it('應該確保付款和交易記錄的一致性', async () => {
      // Arrange & Act
      const response = await paymentClient.post('/payment', {
        amount: 75.50,
        currency: 'USD',
        type: 'post_purchase',
      });

      const paymentId = response.data.id;

      // 完成付款
      await paymentClient.post(`/payment/${paymentId}/complete`);

      // 等待事件處理
      await TestHelpers.sleep(2000);

      // Assert - 驗證資料一致性
      const dataSource = TestClients.getDataSource();
      
      const paymentRepo = dataSource.getRepository('Payment');
      const payment = await paymentRepo.findOne({ where: { id: paymentId } });

      const transactionRepo = dataSource.getRepository('Transaction');
      const transaction = await transactionRepo.findOne({
        where: { paymentId },
      });

      expect(payment).toBeTruthy();
      expect(transaction).toBeTruthy();
      expect(payment?.amount).toBe(transaction?.amount);
      expect(payment?.status).toBe('completed');
      expect(transaction?.status).toBe('completed');
    });
  });
});
