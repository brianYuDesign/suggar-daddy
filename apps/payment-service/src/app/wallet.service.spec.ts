import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PAYMENT_EVENTS } from '@suggar-daddy/common';

describe('WalletService', () => {
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
  };

  const mockKafkaProducer = {
    send: jest.fn(),
  };

  const mockWallet = {
    userId: 'user-123',
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should get wallet for user', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockWallet));

      const result = await service.getWallet('user-123');

      expect(result).toEqual(mockWallet);
      expect(mockRedisClient.get).toHaveBeenCalledWith('wallet:user-123');
    });

    it('should throw NotFoundException when wallet not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(service.getWallet('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('creditWallet', () => {
    it('should credit wallet with tip received', async () => {
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
        'user-123',
        grossAmount,
        'tip_received',
        'tip-456'
      );

      expect(result.balance).toBeGreaterThan(mockWallet.balance);
      expect(mockKafkaProducer.send).toHaveBeenCalledWith(
        PAYMENT_EVENTS.WALLET_CREDITED,
        expect.objectContaining({
          userId: 'user-123',
          amount: grossAmount,
          netAmount: netAmount,
        })
      );
    });

    it('should credit wallet with subscription received', async () => {
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
        'user-123',
        grossAmount,
        'subscription_received',
        'sub-789'
      );

      expect(mockRedisClient.eval).toHaveBeenCalled();
      expect(mockKafkaProducer.send).toHaveBeenCalled();
    });

    it('should create wallet if not exists', async () => {
      const grossAmount = 100;
      const netAmount = 80;

      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({
          userId: 'new-user',
          balance: netAmount,
          pendingBalance: 0,
          totalEarnings: netAmount,
          totalWithdrawn: 0,
          updatedAt: new Date().toISOString(),
        }),
        1, // created flag
      ]);

      const result = await service.creditWallet(
        'new-user',
        grossAmount,
        'tip_received'
      );

      expect(result.userId).toBe('new-user');
      expect(result.balance).toBe(netAmount);
      expect(result.totalEarnings).toBe(netAmount);
    });
  });

  describe('requestWithdrawal', () => {
    it('should request withdrawal successfully', async () => {
      const withdrawalAmount = 500;
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({ ...mockWallet, balance: 1000 })
      );
      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({ ...mockWallet, balance: 500 }),
      ]);

      const result = await service.requestWithdrawal(
        'user-123',
        withdrawalAmount,
        'bank_transfer',
        { accountNumber: '****1234' }
      );

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^withdrawal-/);
      expect(result.amount).toBe(withdrawalAmount);
      expect(result.status).toBe('pending');
      expect(mockKafkaProducer.send).toHaveBeenCalledWith(
        PAYMENT_EVENTS.WITHDRAWAL_REQUESTED,
        expect.objectContaining({
          withdrawalId: result.id,
          userId: 'user-123',
          amount: withdrawalAmount,
        })
      );
    });

    it('should throw BadRequestException for amount below minimum', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockWallet));

      await expect(
        service.requestWithdrawal('user-123', 10, 'bank_transfer')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify({ ...mockWallet, balance: 100 })
      );

      await expect(
        service.requestWithdrawal('user-123', 500, 'bank_transfer')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWithdrawalHistory', () => {
    it('should get withdrawal history for user', async () => {
      const mockWithdrawals = [
        {
          id: 'withdrawal-1',
          userId: 'user-123',
          amount: 500,
          status: 'completed',
          payoutMethod: 'bank_transfer',
          requestedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
        },
        {
          id: 'withdrawal-2',
          userId: 'user-123',
          amount: 300,
          status: 'pending',
          payoutMethod: 'stripe_payout',
          requestedAt: new Date().toISOString(),
        },
      ];

      mockRedisClient.lrange.mockResolvedValue(['withdrawal-1', 'withdrawal-2']);
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockWithdrawals[0]))
        .mockResolvedValueOnce(JSON.stringify(mockWithdrawals[1]));

      const result = await service.getWithdrawalHistory('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('completed');
      expect(result[1].status).toBe('pending');
    });

    it('should return empty array when no withdrawals', async () => {
      mockRedisClient.lrange.mockResolvedValue([]);

      const result = await service.getWithdrawalHistory('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getPendingWithdrawals', () => {
    it('should get all pending withdrawals', async () => {
      const mockPendingIds = ['withdrawal-1', 'withdrawal-2'];
      const mockPendingWithdrawal = {
        id: 'withdrawal-1',
        userId: 'user-123',
        amount: 500,
        status: 'pending',
        payoutMethod: 'bank_transfer',
        requestedAt: new Date().toISOString(),
      };

      mockRedisClient.zrevrange.mockResolvedValue(mockPendingIds);
      mockRedisClient.get.mockResolvedValue(
        JSON.stringify(mockPendingWithdrawal)
      );

      const result = await service.getPendingWithdrawals();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('processWithdrawal', () => {
    it('should process withdrawal successfully', async () => {
      const withdrawalId = 'withdrawal-123';
      const mockWithdrawal = {
        id: withdrawalId,
        userId: 'user-123',
        amount: 500,
        status: 'pending',
        payoutMethod: 'bank_transfer',
        requestedAt: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockWithdrawal));

      const result = await service.processWithdrawal(withdrawalId, 'completed');

      expect(result.status).toBe('completed');
      expect(result.processedAt).toBeDefined();
      expect(mockKafkaProducer.send).toHaveBeenCalledWith(
        PAYMENT_EVENTS.WITHDRAWAL_COMPLETED,
        expect.objectContaining({
          withdrawalId,
          status: 'completed',
        })
      );
    });

    it('should reject withdrawal', async () => {
      const withdrawalId = 'withdrawal-123';
      const mockWithdrawal = {
        id: withdrawalId,
        userId: 'user-123',
        amount: 500,
        status: 'pending',
        payoutMethod: 'bank_transfer',
        requestedAt: new Date().toISOString(),
      };

      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockWithdrawal))
        .mockResolvedValueOnce(JSON.stringify(mockWallet));
      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({ ...mockWallet, balance: mockWallet.balance + 500 }),
      ]);

      const result = await service.processWithdrawal(withdrawalId, 'rejected');

      expect(result.status).toBe('rejected');
      expect(mockKafkaProducer.send).toHaveBeenCalledWith(
        PAYMENT_EVENTS.WITHDRAWAL_REJECTED,
        expect.anything()
      );
    });

    it('should throw NotFoundException for non-existent withdrawal', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(
        service.processWithdrawal('non-existent', 'completed')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWalletHistory', () => {
    it('should get wallet transaction history', async () => {
      const mockHistory = [
        {
          id: 'wh-1',
          userId: 'user-123',
          type: 'tip_received',
          amount: 100,
          netAmount: 80,
          description: 'Tip from user',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'wh-2',
          userId: 'user-123',
          type: 'withdrawal',
          amount: -500,
          netAmount: -500,
          description: 'Withdrawal request',
          createdAt: new Date().toISOString(),
        },
      ];

      mockRedisClient.lrange.mockResolvedValue(['wh-1', 'wh-2']);
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockHistory[0]))
        .mockResolvedValueOnce(JSON.stringify(mockHistory[1]));

      const result = await service.getWalletHistory('user-123', 10);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('tip_received');
      expect(result[1].type).toBe('withdrawal');
    });
  });

  describe('clearPendingBalance', () => {
    it('should clear pending balance to available balance', async () => {
      mockRedisClient.eval.mockResolvedValue([
        JSON.stringify({
          ...mockWallet,
          balance: mockWallet.balance + mockWallet.pendingBalance,
          pendingBalance: 0,
        }),
      ]);

      const result = await service.clearPendingBalance('user-123');

      expect(result.pendingBalance).toBe(0);
      expect(result.balance).toBeGreaterThan(mockWallet.balance);
      expect(mockKafkaProducer.send).toHaveBeenCalledWith(
        PAYMENT_EVENTS.PENDING_BALANCE_CLEARED,
        expect.objectContaining({ userId: 'user-123' })
      );
    });
  });
});
