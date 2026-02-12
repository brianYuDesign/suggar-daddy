import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { RedisService } from '@suggar-daddy/redis';
import { KafkaProducerService } from '@suggar-daddy/kafka';

describe('WalletService', () => {
  let service: WalletService;
  let redis: jest.Mocked<Pick<RedisService, 'get' | 'set' | 'lPush' | 'lRange'>>;
  let kafka: jest.Mocked<Pick<KafkaProducerService, 'sendEvent'>>;

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      lPush: jest.fn().mockResolvedValue(0),
      lRange: jest.fn().mockResolvedValue([]),
    };
    kafka = { sendEvent: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: RedisService, useValue: redis },
        { provide: KafkaProducerService, useValue: kafka },
      ],
    }).compile();

    service = module.get(WalletService);
    jest.clearAllMocks();
  });

  // ── getWallet ──────────────────────────────────────────────────

  describe('getWallet', () => {
    it('should return existing wallet from Redis', async () => {
      const wallet = {
        userId: 'u1',
        balance: 100,
        pendingBalance: 0,
        totalEarnings: 200,
        totalWithdrawn: 100,
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      redis.get.mockResolvedValue(JSON.stringify(wallet));

      const result = await service.getWallet('u1');

      expect(result).toEqual(wallet);
      expect(redis.get).toHaveBeenCalledWith('wallet:u1');
    });

    it('should initialize wallet if not exists', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue(undefined);

      const result = await service.getWallet('u-new');

      expect(result.userId).toBe('u-new');
      expect(result.balance).toBe(0);
      expect(result.pendingBalance).toBe(0);
      expect(result.totalEarnings).toBe(0);
      expect(result.totalWithdrawn).toBe(0);
      expect(redis.set).toHaveBeenCalledWith(
        'wallet:u-new',
        expect.any(String),
      );
    });

    it('should persist the newly initialized wallet', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue(undefined);

      await service.getWallet('u2');

      const saved = JSON.parse(redis.set.mock.calls[0][1] as string);
      expect(saved.userId).toBe('u2');
      expect(saved.balance).toBe(0);
    });
  });

  // ── creditWallet ──────────────────────────────────────────────

  describe('creditWallet', () => {
    const existingWallet = {
      userId: 'creator-1',
      balance: 50,
      pendingBalance: 0,
      totalEarnings: 50,
      totalWithdrawn: 0,
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      redis.get.mockResolvedValue(JSON.stringify(existingWallet));
    });

    it('should deduct 20% platform fee and credit net amount', async () => {
      const result = await service.creditWallet('creator-1', 100, 'tip_received', 'tip-1');

      // 100 * 0.2 = 20 fee, net = 80
      expect(result.balance).toBe(130); // 50 + 80
      expect(result.totalEarnings).toBe(130); // 50 + 80
    });

    it('should handle small amounts with rounding correctly', async () => {
      const result = await service.creditWallet('creator-1', 1.5, 'tip_received');

      // fee = 1.5 * 0.2 = 0.3, net = 1.2
      expect(result.balance).toBe(51.2);
    });

    it('should record wallet transaction in history', async () => {
      await service.creditWallet('creator-1', 100, 'subscription_received', 'sub-1');

      expect(redis.lPush).toHaveBeenCalledWith(
        'wallet:history:creator-1',
        expect.stringContaining('"type":"subscription_received"'),
      );
    });

    it('should send WALLET_CREDITED Kafka event', async () => {
      await service.creditWallet('creator-1', 100, 'tip_received', 'tip-1');

      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'payment.wallet.credited',
        expect.objectContaining({
          userId: 'creator-1',
          type: 'tip_received',
          grossAmount: 100,
          netAmount: 80,
          platformFee: 20,
          referenceId: 'tip-1',
        }),
      );
    });

    it('should credit ppv_received type correctly', async () => {
      const result = await service.creditWallet('creator-1', 50, 'ppv_received', 'ppv-1');

      // fee = 10, net = 40
      expect(result.balance).toBe(90); // 50 + 40
      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'payment.wallet.credited',
        expect.objectContaining({ type: 'ppv_received', netAmount: 40 }),
      );
    });

    it('should persist updated wallet to Redis', async () => {
      await service.creditWallet('creator-1', 100, 'tip_received');

      expect(redis.set).toHaveBeenCalledWith(
        'wallet:creator-1',
        expect.any(String),
      );
      const saved = JSON.parse(redis.set.mock.calls[0][1] as string);
      expect(saved.balance).toBe(130);
    });
  });

  // ── requestWithdrawal ──────────────────────────────────────────

  describe('requestWithdrawal', () => {
    const richWallet = {
      userId: 'creator-1',
      balance: 200,
      pendingBalance: 0,
      totalEarnings: 500,
      totalWithdrawn: 300,
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    it('should reject withdrawal below $20 minimum', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      await expect(
        service.requestWithdrawal('creator-1', 19, 'bank_transfer'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestWithdrawal('creator-1', 5, 'bank_transfer'),
      ).rejects.toThrow('Minimum withdrawal amount');
    });

    it('should reject withdrawal exceeding balance', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      await expect(
        service.requestWithdrawal('creator-1', 250, 'bank_transfer'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestWithdrawal('creator-1', 250, 'bank_transfer'),
      ).rejects.toThrow('Insufficient balance');
    });

    it('should create a pending withdrawal and deduct balance', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      const result = await service.requestWithdrawal('creator-1', 50, 'bank_transfer', '****1234');

      expect(result.id).toMatch(/^wd-/);
      expect(result.userId).toBe('creator-1');
      expect(result.amount).toBe(50);
      expect(result.status).toBe('pending');
      expect(result.payoutMethod).toBe('bank_transfer');
      expect(result.payoutDetails).toBe('****1234');
    });

    it('should deduct balance immediately', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      await service.requestWithdrawal('creator-1', 50, 'bank_transfer');

      // Wallet save should show deducted balance
      const walletSaveCall = redis.set.mock.calls.find(
        (c) => (c[0] as string) === 'wallet:creator-1',
      );
      expect(walletSaveCall).toBeDefined();
      const savedWallet = JSON.parse(walletSaveCall![1] as string);
      expect(savedWallet.balance).toBe(150); // 200 - 50
    });

    it('should send WITHDRAWAL_REQUESTED Kafka event', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      await service.requestWithdrawal('creator-1', 50, 'stripe_payout');

      expect(kafka.sendEvent).toHaveBeenCalledWith(
        'payment.withdrawal.requested',
        expect.objectContaining({
          userId: 'creator-1',
          amount: 50,
          payoutMethod: 'stripe_payout',
        }),
      );
    });

    it('should record withdrawal in wallet history', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      await service.requestWithdrawal('creator-1', 50, 'bank_transfer');

      expect(redis.lPush).toHaveBeenCalledWith(
        'wallet:history:creator-1',
        expect.stringContaining('"type":"withdrawal"'),
      );
    });

    it('should add withdrawal to pending list', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      await service.requestWithdrawal('creator-1', 50, 'bank_transfer');

      expect(redis.lPush).toHaveBeenCalledWith(
        'withdrawals:pending',
        expect.stringMatching(/^wd-/),
      );
    });

    it('should allow withdrawal exactly at $20 minimum', async () => {
      redis.get.mockResolvedValue(JSON.stringify(richWallet));

      const result = await service.requestWithdrawal('creator-1', 20, 'bank_transfer');

      expect(result.status).toBe('pending');
      expect(result.amount).toBe(20);
    });
  });

  // ── processWithdrawal ──────────────────────────────────────────

  describe('processWithdrawal', () => {
    const pendingWithdrawal = {
      id: 'wd-1',
      userId: 'creator-1',
      amount: 100,
      status: 'pending',
      payoutMethod: 'bank_transfer',
      requestedAt: '2025-01-01T00:00:00.000Z',
    };

    const wallet = {
      userId: 'creator-1',
      balance: 100,
      pendingBalance: 0,
      totalEarnings: 400,
      totalWithdrawn: 200,
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    it('should throw NotFoundException for non-existent withdrawal', async () => {
      redis.get.mockResolvedValue(null);

      await expect(
        service.processWithdrawal('wd-missing', 'approve'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already processed withdrawal', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ ...pendingWithdrawal, status: 'completed' }),
      );

      await expect(
        service.processWithdrawal('wd-1', 'approve'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processWithdrawal('wd-1', 'approve'),
      ).rejects.toThrow('already completed');
    });

    describe('approve', () => {
      it('should mark withdrawal as completed', async () => {
        redis.get
          .mockResolvedValueOnce(JSON.stringify(pendingWithdrawal)) // withdrawal lookup
          .mockResolvedValueOnce(JSON.stringify(wallet)); // getWallet

        const result = await service.processWithdrawal('wd-1', 'approve');

        expect(result.status).toBe('completed');
        expect(result.processedAt).toBeDefined();
      });

      it('should update totalWithdrawn on wallet', async () => {
        redis.get
          .mockResolvedValueOnce(JSON.stringify(pendingWithdrawal))
          .mockResolvedValueOnce(JSON.stringify(wallet));

        await service.processWithdrawal('wd-1', 'approve');

        const walletSave = redis.set.mock.calls.find(
          (c) => (c[0] as string) === 'wallet:creator-1',
        );
        expect(walletSave).toBeDefined();
        const saved = JSON.parse(walletSave![1] as string);
        expect(saved.totalWithdrawn).toBe(300); // 200 + 100
      });

      it('should send WITHDRAWAL_COMPLETED Kafka event', async () => {
        redis.get
          .mockResolvedValueOnce(JSON.stringify(pendingWithdrawal))
          .mockResolvedValueOnce(JSON.stringify(wallet));

        await service.processWithdrawal('wd-1', 'approve');

        expect(kafka.sendEvent).toHaveBeenCalledWith(
          'payment.withdrawal.completed',
          expect.objectContaining({
            withdrawalId: 'wd-1',
            userId: 'creator-1',
            amount: 100,
          }),
        );
      });
    });

    describe('reject', () => {
      it('should mark withdrawal as rejected', async () => {
        redis.get
          .mockResolvedValueOnce(JSON.stringify(pendingWithdrawal))
          .mockResolvedValueOnce(JSON.stringify(wallet));

        const result = await service.processWithdrawal('wd-1', 'reject');

        expect(result.status).toBe('rejected');
        expect(result.processedAt).toBeDefined();
      });

      it('should refund balance on rejection', async () => {
        redis.get
          .mockResolvedValueOnce(JSON.stringify(pendingWithdrawal))
          .mockResolvedValueOnce(JSON.stringify(wallet));

        await service.processWithdrawal('wd-1', 'reject');

        const walletSave = redis.set.mock.calls.find(
          (c) => (c[0] as string) === 'wallet:creator-1',
        );
        expect(walletSave).toBeDefined();
        const saved = JSON.parse(walletSave![1] as string);
        expect(saved.balance).toBe(200); // 100 + 100 refunded
      });

      it('should NOT send Kafka event on rejection', async () => {
        redis.get
          .mockResolvedValueOnce(JSON.stringify(pendingWithdrawal))
          .mockResolvedValueOnce(JSON.stringify(wallet));

        await service.processWithdrawal('wd-1', 'reject');

        expect(kafka.sendEvent).not.toHaveBeenCalled();
      });
    });
  });

  // ── getWalletHistory ──────────────────────────────────────────

  describe('getWalletHistory', () => {
    it('should return parsed wallet transactions', async () => {
      const tx = {
        id: 'wt-1',
        userId: 'u1',
        type: 'tip_received',
        amount: 50,
        netAmount: 40,
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      redis.lRange.mockResolvedValue([JSON.stringify(tx)]);

      const result = await service.getWalletHistory('u1');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('tip_received');
      expect(redis.lRange).toHaveBeenCalledWith('wallet:history:u1', 0, 49);
    });

    it('should respect custom limit', async () => {
      redis.lRange.mockResolvedValue([]);

      await service.getWalletHistory('u1', 10);

      expect(redis.lRange).toHaveBeenCalledWith('wallet:history:u1', 0, 9);
    });
  });

  // ── getEarningsSummary ──────────────────────────────────────────

  describe('getEarningsSummary', () => {
    it('should aggregate wallet, transactions, and pending withdrawals', async () => {
      const wallet = {
        userId: 'u1',
        balance: 100,
        pendingBalance: 0,
        totalEarnings: 500,
        totalWithdrawn: 400,
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      const walletTx = {
        id: 'wt-1',
        type: 'tip_received',
        amount: 50,
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      const pendingWd = {
        id: 'wd-1',
        userId: 'u1',
        amount: 50,
        status: 'pending',
        requestedAt: '2025-01-01T00:00:00.000Z',
      };

      redis.get
        .mockResolvedValueOnce(JSON.stringify(wallet))     // getWallet
        .mockResolvedValueOnce(JSON.stringify(pendingWd)); // withdrawal record

      redis.lRange
        .mockResolvedValueOnce([JSON.stringify(walletTx)]) // wallet history
        .mockResolvedValueOnce(['wd-1']);                   // withdrawal ids

      const result = await service.getEarningsSummary('u1');

      expect(result.wallet.balance).toBe(100);
      expect(result.recentTransactions).toHaveLength(1);
      expect(result.pendingWithdrawals).toHaveLength(1);
      expect(result.pendingWithdrawals[0].status).toBe('pending');
    });
  });
});
