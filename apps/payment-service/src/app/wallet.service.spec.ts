import { Test, TestingModule } from "@nestjs/testing";
import { WalletService } from "./wallet.service";
import { RedisService } from "@suggar-daddy/redis";
import { KafkaProducerService } from "@suggar-daddy/kafka";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PAYMENT_EVENTS } from "@suggar-daddy/common";

describe("WalletService", () => {
  let service: WalletService;
  let redisService: jest.Mocked<RedisService>;
  let kafkaProducer: jest.Mocked<KafkaProducerService>;

  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
    eval: jest.fn(),
    evalsha: jest.fn(),
    zadd: jest.fn(),
    zrevrange: jest.fn(),
    zcard: jest.fn(),
    del: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn(() => mockRedisClient),
    get: jest.fn(),
    set: jest.fn(),
    lRange: jest.fn(),
    mget: jest.fn(),
    lPush: jest.fn(),
    lLen: jest.fn(),
  };

  const mockKafkaProducer = {
    send: jest.fn(),
    sendEvent: jest.fn(),
  };

  const mockWallet = {
    userId: "user-123",
    balance: 1000,
    pendingBalance: 500,
    totalEarnings: 2000,
    totalWithdrawn: 500,
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
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

    service = module.get<WalletService>(WalletService);
    redisService = module.get(RedisService);
    kafkaProducer = module.get(KafkaProducerService);

    // Configure Kafka producer mock to return resolved Promise for sendEvent
    mockKafkaProducer.sendEvent = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getWallet", () => {
    it("should get wallet for user", async () => {
      mockRedisService.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockWallet));

      const result = await service.getWallet("user-123");

      expect(result).toEqual(mockWallet);
    });

    it("should throw NotFoundException when wallet not found", async () => {
      mockRedisService.get = jest.fn().mockResolvedValue(null);
      mockRedisService.set = jest.fn().mockResolvedValue("OK");

      const result = await service.getWallet("non-existent");

      expect(result).toBeDefined();
      expect(result.userId).toBe("non-existent");
      expect(result.balance).toBe(0);
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe("creditWallet", () => {
    it("should credit wallet with tip received", async () => {
      const grossAmount = 100;
      const platformFee = 20; // 20%
      const netAmount = 80;

      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({
          ...mockWallet,
          balance: mockWallet.balance + netAmount,
          totalEarnings: mockWallet.totalEarnings + netAmount,
        }),
        0,
      ]);

      const result = await service.creditWallet(
        "user-123",
        grossAmount,
        "tip_received",
        "tip-456",
      );

      expect(result.balance).toBeGreaterThan(mockWallet.balance);
    });

    it("should credit wallet with subscription received", async () => {
      const grossAmount = 500;
      const netAmount = 400; // after 20% platform fee

      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({
          ...mockWallet,
          balance: mockWallet.balance + netAmount,
        }),
        0,
      ]);

      await service.creditWallet(
        "user-123",
        grossAmount,
        "subscription_received",
        "sub-789",
      );

      expect(mockRedisClient.eval).toHaveBeenCalled();
      expect(mockKafkaProducer.sendEvent).toHaveBeenCalled();
    });

    it("should create wallet if not exists", async () => {
      const grossAmount = 100;
      const netAmount = 80;

      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({
          userId: "new-user",
          balance: netAmount,
          pendingBalance: 0,
          totalEarnings: netAmount,
          totalWithdrawn: 0,
          updatedAt: new Date().toISOString(),
        }),
        1, // created flag
      ]);

      const result = await service.creditWallet(
        "new-user",
        grossAmount,
        "tip_received",
      );

      expect(result.userId).toBe("new-user");
      expect(result.balance).toBe(netAmount);
      expect(result.totalEarnings).toBe(netAmount);
    });
  });

  describe("requestWithdrawal", () => {
    it("should request withdrawal successfully", async () => {
      const withdrawalAmount = 500;
      mockRedisClient.eval.mockResolvedValue({
        ok: "OK",
      });
      mockRedisService.lPush = jest.fn().mockResolvedValue(1);

      const result = await service.requestWithdrawal(
        "user-123",
        withdrawalAmount,
        "bank_transfer",
        JSON.stringify({ accountNumber: "****1234" }),
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^wd-/);
      expect(result.amount).toBe(withdrawalAmount);
      expect(result.status).toBe("pending");
      expect(mockKafkaProducer.sendEvent).toHaveBeenCalledWith(
        PAYMENT_EVENTS.WITHDRAWAL_REQUESTED,
        expect.objectContaining({
          withdrawalId: result.id,
          userId: "user-123",
          amount: withdrawalAmount,
        }),
      );
    });

    it("should throw BadRequestException for amount below minimum", async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockWallet));

      await expect(
        service.requestWithdrawal("user-123", 10, "bank_transfer"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for insufficient balance", async () => {
      mockRedisClient.eval.mockResolvedValue({
        err: "INSUFFICIENT_BALANCE",
        balance: 100,
      });

      await expect(
        service.requestWithdrawal("user-123", 500, "bank_transfer"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getWithdrawals", () => {
    it("should get withdrawal history for user", async () => {
      const mockWithdrawals = [
        {
          id: "withdrawal-1",
          userId: "user-123",
          amount: 500,
          status: "pending",
          payoutMethod: "bank_transfer",
          requestedAt: new Date().toISOString(),
        },
        {
          id: "withdrawal-2",
          userId: "user-123",
          amount: 300,
          status: "pending",
          payoutMethod: "stripe_payout",
          requestedAt: new Date().toISOString(),
        },
      ];

      mockRedisService.lRange = jest
        .fn()
        .mockResolvedValue(["withdrawal-1", "withdrawal-2"]);
      mockRedisService.mget = jest
        .fn()
        .mockResolvedValue([
          JSON.stringify(mockWithdrawals[0]),
          JSON.stringify(mockWithdrawals[1]),
        ]);

      const result = await service.getWithdrawals("user-123");

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("pending");
      expect(result[1].status).toBe("pending");
    });

    it("should return empty array when no withdrawals", async () => {
      mockRedisService.lRange = jest.fn().mockResolvedValue([]);
      mockRedisService.mget = jest.fn().mockResolvedValue([]);

      const result = await service.getWithdrawals("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("getPendingWithdrawals", () => {
    it("should get all pending withdrawals", async () => {
      const mockPendingIds = ["withdrawal-1", "withdrawal-2"];
      const mockPendingWithdrawal1 = {
        id: "withdrawal-1",
        userId: "user-123",
        amount: 500,
        status: "pending",
        payoutMethod: "bank_transfer",
        requestedAt: new Date().toISOString(),
      };

      const mockPendingWithdrawal2 = {
        id: "withdrawal-2",
        userId: "user-456",
        amount: 300,
        status: "pending",
        payoutMethod: "stripe_payout",
        requestedAt: new Date().toISOString(),
      };

      mockRedisClient.lrange.mockResolvedValue(mockPendingIds);
      mockRedisService.mget = jest
        .fn()
        .mockResolvedValue([
          JSON.stringify(mockPendingWithdrawal1),
          JSON.stringify(mockPendingWithdrawal2),
        ]);

      const result = await service.getPendingWithdrawals();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("pending");
    });
  });

  describe("processWithdrawal", () => {
    it("should approve withdrawal successfully", async () => {
      const withdrawalId = "withdrawal-123";
      const mockWithdrawal = {
        id: withdrawalId,
        userId: "user-123",
        amount: 500,
        status: "pending",
        payoutMethod: "bank_transfer",
        requestedAt: new Date().toISOString(),
      };

      mockRedisService.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockWithdrawal));
      mockRedisClient.eval.mockResolvedValue({
        ok: "OK",
      });
      mockKafkaProducer.sendEvent = jest.fn().mockResolvedValue(undefined);

      const result = await service.processWithdrawal(withdrawalId, "approve");

      expect(result.status).toBe("completed");
      expect(result.processedAt).toBeDefined();
    });

    it("should reject withdrawal", async () => {
      const withdrawalId = "withdrawal-123";
      const mockWithdrawal = {
        id: withdrawalId,
        userId: "user-123",
        amount: 500,
        status: "pending",
        payoutMethod: "bank_transfer",
        requestedAt: new Date().toISOString(),
      };

      mockRedisService.get = jest
        .fn()
        .mockResolvedValue(JSON.stringify(mockWithdrawal));

      const result = await service.processWithdrawal(withdrawalId, "reject");

      expect(result.status).toBe("rejected");
    });

    it("should throw NotFoundException for non-existent withdrawal", async () => {
      mockRedisService.get = jest.fn().mockResolvedValue(null);

      await expect(
        service.processWithdrawal("non-existent", "approve"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getWalletHistory", () => {
    it("should get wallet transaction history", async () => {
      const mockHistory = [
        {
          id: "wh-1",
          userId: "user-123",
          type: "tip_received",
          amount: 100,
          netAmount: 80,
          description: "Tip from user",
          createdAt: new Date().toISOString(),
        },
        {
          id: "wh-2",
          userId: "user-123",
          type: "withdrawal",
          amount: -500,
          netAmount: -500,
          description: "Withdrawal request",
          createdAt: new Date().toISOString(),
        },
      ];

      mockRedisService.lRange = jest
        .fn()
        .mockResolvedValue([
          JSON.stringify(mockHistory[0]),
          JSON.stringify(mockHistory[1]),
        ]);

      const result = await service.getWalletHistory("user-123", 10);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("tip_received");
      expect(result[1].type).toBe("withdrawal");
    });
  });
});
