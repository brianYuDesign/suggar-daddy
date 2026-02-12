import { Test, TestingModule } from "@nestjs/testing";
import { TransactionService } from "./transaction.service";
import { RedisService } from "@suggar-daddy/redis";
import { KafkaProducerService } from "@suggar-daddy/kafka";
import { NotFoundException } from "@nestjs/common";
import { PAYMENT_EVENTS } from "@suggar-daddy/common";

// Mock implementations to match actual Redis methods
const createMockRedisClient = () => ({
  get: jest.fn(),
  set: jest.fn(),
  lpush: jest.fn(),
  lrange: jest.fn(),
  zadd: jest.fn(),
  zrevrange: jest.fn(),
  zcard: jest.fn(),
  llen: jest.fn(),
  pipeline: jest.fn(() => ({
    set: jest.fn().mockReturnThis(),
    lpush: jest.fn().mockReturnThis(),
    zadd: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  mget: jest.fn(),
  del: jest.fn(),
});

describe("TransactionService", () => {
  let service: TransactionService;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
    zadd: jest.fn(),
    zrevrange: jest.fn(),
    zcard: jest.fn(),
    pipeline: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      lpush: jest.fn().mockReturnThis(),
      zadd: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
    get: jest.fn(),
    set: jest.fn(),
    lLen: jest.fn(),
    lRange: jest.fn(),
    mget: jest.fn(),
  };

  const mockKafkaProducer = {
    send: jest.fn(),
    sendEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafkaProducer,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a transaction successfully", async () => {
      const createDto = {
        userId: "user-123",
        amount: 1000,
        type: "subscription" as const,
        relatedEntityId: "sub-456",
        relatedEntityType: "subscription",
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^tx-/);
      expect(result.userId).toBe(createDto.userId);
      expect(result.amount).toBe(createDto.amount);
      expect(result.status).toBe("pending");
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
    });

    it("should create transaction with stripe payment ID", async () => {
      const createDto = {
        userId: "user-123",
        amount: 1000,
        type: "subscription" as const,
        stripePaymentId: "pi_123456",
      };

      const result = await service.create(createDto);

      expect(result.stripePaymentId).toBe("pi_123456");
      expect(mockRedisClient.pipeline).toHaveBeenCalled();
    });

    it("should include metadata if provided", async () => {
      const createDto = {
        userId: "user-123",
        amount: 500,
        type: "tip" as const,
        metadata: { creatorId: "creator-789", postId: "post-101" },
      };

      const result = await service.create(createDto);

      expect(result.metadata).toEqual(createDto.metadata);
    });
  });

  describe("findAll", () => {
    it("should return paginated transactions", async () => {
      const mockTxIds = ["tx-1", "tx-2", "tx-3"];
      const mockTransactions = mockTxIds.map((id, index) => ({
        id,
        userId: "user-123",
        amount: 1000 + index * 100,
        type: "subscription",
        status: "succeeded",
        stripePaymentId: null,
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      }));

      mockRedisClient.zrevrange.mockResolvedValue(mockTxIds);
      mockRedisClient.zcard.mockResolvedValue(10);
      mockRedisService.mget = jest
        .fn()
        .mockResolvedValue([
          JSON.stringify(mockTransactions[0]),
          JSON.stringify(mockTransactions[1]),
          JSON.stringify(mockTransactions[2]),
        ]);

      const result = await service.findAll(1, 3);

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
      expect(mockRedisClient.zrevrange).toHaveBeenCalledWith(
        "transactions:all:by-time",
        0,
        2,
      );
    });

    it("should return empty array when no transactions exist", async () => {
      mockRedisClient.zrevrange.mockResolvedValue([]);
      mockRedisClient.zcard.mockResolvedValue(0);

      const result = await service.findAll(1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("findByUser", () => {
    it("should find all transactions for a user", async () => {
      const userId = "user-123";
      const mockTxIds = ["tx-1", "tx-2"];
      const mockTx1 = {
        id: "tx-1",
        userId,
        amount: 1000,
        type: "subscription",
        status: "succeeded",
        stripePaymentId: null,
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      const mockTx2 = {
        id: "tx-2",
        userId,
        amount: 2000,
        type: "tip",
        status: "succeeded",
        stripePaymentId: null,
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockRedisService.lLen = jest.fn().mockResolvedValue(2);
      mockRedisService.lRange = jest.fn().mockResolvedValue(mockTxIds);
      mockRedisService.mget = jest
        .fn()
        .mockResolvedValue([JSON.stringify(mockTx1), JSON.stringify(mockTx2)]);

      const result = await service.findByUser(userId);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data[0].userId).toBe(userId);
    });
  });

  describe("findOne", () => {
    it("should find transaction by ID", async () => {
      const txId = "tx-123";
      const mockTx = {
        id: txId,
        userId: "user-123",
        amount: 1000,
        type: "subscription",
        status: "succeeded",
        stripePaymentId: null,
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockRedisService.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockTx));

      const result = await service.findOne(txId);

      expect(result).toEqual(mockTx);
    });

    it("should throw NotFoundException when transaction not found", async () => {
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByStripePaymentId", () => {
    it("should find transaction by Stripe payment ID", async () => {
      const stripeId = "pi_123456";
      const txId = "tx-123";
      const mockTx = {
        id: txId,
        userId: "user-123",
        amount: 1000,
        type: "subscription",
        status: "succeeded",
        stripePaymentId: stripeId,
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockRedisService.get = jest
        .fn()
        .mockResolvedValueOnce(txId)
        .mockResolvedValueOnce(JSON.stringify(mockTx));

      const result = await service.findByStripePaymentId(stripeId);

      expect(result).toEqual(mockTx);
    });

    it("should return null when stripe transaction not found", async () => {
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      const result = await service.findByStripePaymentId("pi_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update transaction status to succeeded", async () => {
      const txId = "tx-123";
      const mockTx = {
        id: txId,
        userId: "user-123",
        amount: 1000,
        type: "subscription",
        status: "pending",
        stripePaymentId: "pi_123",
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockRedisService.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockTx));
      mockRedisService.set = jest.fn().mockResolvedValue("OK");

      const result = await service.update(txId, { status: "succeeded" });

      expect(result.status).toBe("succeeded");
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(mockKafkaProducer.sendEvent).toHaveBeenCalledWith(
        PAYMENT_EVENTS.PAYMENT_COMPLETED,
        expect.objectContaining({
          transactionId: txId,
          userId: "user-123",
        }),
      );
    });

    it("should update transaction status to failed", async () => {
      const txId = "tx-123";
      const mockTx = {
        id: txId,
        userId: "user-123",
        amount: 1000,
        type: "subscription",
        status: "pending",
        stripePaymentId: null,
        relatedEntityId: null,
        relatedEntityType: null,
        metadata: null,
        createdAt: new Date().toISOString(),
      };

      mockRedisService.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockTx));
      mockRedisService.set = jest.fn().mockResolvedValue("OK");

      const result = await service.update(txId, { status: "failed" });

      expect(result.status).toBe("failed");
    });
  });
});
