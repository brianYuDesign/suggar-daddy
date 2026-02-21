import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DiamondBalanceEntity,
  DiamondTransactionEntity,
  DiamondPurchaseEntity,
  UserEntity,
} from '@suggar-daddy/database';
import { RedisService } from '@suggar-daddy/redis';

const CACHE_TTL = 300;

@Injectable()
export class DiamondManagementService {
  private readonly logger = new Logger(DiamondManagementService.name);
  private paymentServiceUrl: string;

  constructor(
    @InjectRepository(DiamondBalanceEntity)
    private readonly balanceRepo: Repository<DiamondBalanceEntity>,
    @InjectRepository(DiamondTransactionEntity)
    private readonly transactionRepo: Repository<DiamondTransactionEntity>,
    @InjectRepository(DiamondPurchaseEntity)
    private readonly purchaseRepo: Repository<DiamondPurchaseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly redis: RedisService,
  ) {
    this.paymentServiceUrl = `http://localhost:${process.env['PAYMENT_SERVICE_PORT'] || 3007}`;
  }

  private async proxyGet(path: string, token: string) {
    const res = await fetch(`${this.paymentServiceUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Payment service error: ${res.status}`);
    return res.json();
  }

  private async proxyPost(path: string, body: unknown, token: string) {
    const res = await fetch(`${this.paymentServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Payment service error: ${res.status}`);
    return res.json();
  }

  private async proxyPut(path: string, body: unknown, token: string) {
    const res = await fetch(`${this.paymentServiceUrl}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Payment service error: ${res.status}`);
    return res.json();
  }

  private async proxyDelete(path: string, token: string) {
    const res = await fetch(`${this.paymentServiceUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Payment service error: ${res.status}`);
    return res.json();
  }

  async getStats() {
    const cacheKey = 'admin:diamond:stats';
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* recompute */ }
    }

    const result = await this.balanceRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.balance), 0)', 'totalInCirculation')
      .addSelect('COALESCE(SUM(b.totalPurchased), 0)', 'totalPurchased')
      .addSelect('COALESCE(SUM(b.totalSpent), 0)', 'totalSpent')
      .addSelect('COALESCE(SUM(b.totalReceived), 0)', 'totalReceived')
      .addSelect('COALESCE(SUM(b.totalConverted), 0)', 'totalConverted')
      .addSelect('COUNT(*)', 'userCount')
      .addSelect('COALESCE(AVG(b.balance), 0)', 'averageBalance')
      .getRawOne();

    const stats = {
      totalInCirculation: Number(result?.totalInCirculation) || 0,
      totalPurchased: Number(result?.totalPurchased) || 0,
      totalSpent: Number(result?.totalSpent) || 0,
      totalReceived: Number(result?.totalReceived) || 0,
      totalConverted: Number(result?.totalConverted) || 0,
      userCount: Number(result?.userCount) || 0,
      averageBalance: Math.round((Number(result?.averageBalance) || 0) * 100) / 100,
    };

    await this.redis.set(cacheKey, JSON.stringify(stats), CACHE_TTL);
    return stats;
  }

  async listBalances(page = 1, limit = 20, search?: string) {
    const qb = this.balanceRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect(UserEntity, 'u', 'u.id = b.userId');

    if (search) {
      qb.where('b.userId = :search OR u.email ILIKE :like OR u.displayName ILIKE :like', {
        search,
        like: `%${search}%`,
      });
    }

    const total = await qb.getCount();
    const raw = await qb
      .select([
        'b.userId AS "userId"',
        'b.balance AS "balance"',
        'b."totalPurchased" AS "totalPurchased"',
        'b."totalSpent" AS "totalSpent"',
        'b."totalReceived" AS "totalReceived"',
        'b."totalConverted" AS "totalConverted"',
        'b."updatedAt" AS "updatedAt"',
        'u.id AS "user_id"',
        'u.email AS "user_email"',
        'u."displayName" AS "user_displayName"',
      ])
      .orderBy('b.balance', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const data = raw.map((r: Record<string, unknown>) => ({
      userId: r.userId as string,
      balance: Number(r.balance),
      totalPurchased: Number(r.totalPurchased),
      totalSpent: Number(r.totalSpent),
      totalReceived: Number(r.totalReceived),
      totalConverted: Number(r.totalConverted),
      updatedAt: r.updatedAt as string,
      user: r.user_id ? { id: r.user_id as string, email: r.user_email as string, displayName: r.user_displayName as string } : null,
    }));

    return { data, total, page, limit };
  }

  async getBalance(userId: string) {
    const balance = await this.balanceRepo.findOne({ where: { userId } });
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'email', 'displayName'] });

    const transactions = await this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return {
      userId,
      balance: balance?.balance ?? 0,
      totalPurchased: balance?.totalPurchased ?? 0,
      totalSpent: balance?.totalSpent ?? 0,
      totalReceived: balance?.totalReceived ?? 0,
      totalConverted: balance?.totalConverted ?? 0,
      updatedAt: balance?.updatedAt?.toISOString() ?? null,
      user: user ? { id: user.id, email: user.email, displayName: user.displayName } : null,
      recentTransactions: transactions.map((t) => ({
        id: t.id,
        userId: t.userId,
        type: t.type,
        amount: t.amount,
        referenceId: t.referenceId,
        referenceType: t.referenceType,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
        user: null,
      })),
    };
  }

  async adjustBalance(userId: string, amount: number, reason: string, token: string) {
    const result = await this.proxyPost('/diamonds/admin-adjust', { userId, amount, reason }, token);
    await this.redis.del('admin:diamond:stats');
    return result;
  }

  async listTransactions(page = 1, limit = 20, type?: string, userId?: string) {
    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect(UserEntity, 'u', 'u.id = t.userId');

    if (type) qb.andWhere('t.type = :type', { type });
    if (userId) qb.andWhere('t.userId = :userId', { userId });

    const total = await qb.getCount();
    const raw = await qb
      .select([
        't.id AS "id"',
        't.userId AS "userId"',
        't.type AS "type"',
        't.amount AS "amount"',
        't."referenceId" AS "referenceId"',
        't."referenceType" AS "referenceType"',
        't.description AS "description"',
        't."createdAt" AS "createdAt"',
        'u.id AS "user_id"',
        'u.email AS "user_email"',
        'u."displayName" AS "user_displayName"',
      ])
      .orderBy('t."createdAt"', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const data = raw.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      userId: r.userId as string,
      type: r.type as string,
      amount: Number(r.amount),
      referenceId: (r.referenceId as string) || null,
      referenceType: (r.referenceType as string) || null,
      description: (r.description as string) || null,
      createdAt: r.createdAt as string,
      user: r.user_id ? { id: r.user_id as string, email: r.user_email as string, displayName: r.user_displayName as string } : null,
    }));

    return { data, total, page, limit };
  }

  async listPurchases(page = 1, limit = 20, status?: string, userId?: string) {
    const qb = this.purchaseRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect(UserEntity, 'u', 'u.id = p.userId');

    if (status) qb.andWhere('p.status = :status', { status });
    if (userId) qb.andWhere('p.userId = :userId', { userId });

    const total = await qb.getCount();
    const raw = await qb
      .select([
        'p.id AS "id"',
        'p.userId AS "userId"',
        'p."packageId" AS "packageId"',
        'p."diamondAmount" AS "diamondAmount"',
        'p."bonusDiamonds" AS "bonusDiamonds"',
        'p."totalDiamonds" AS "totalDiamonds"',
        'p."amountUsd" AS "amountUsd"',
        'p."stripePaymentId" AS "stripePaymentId"',
        'p.status AS "status"',
        'p."createdAt" AS "createdAt"',
        'u.id AS "user_id"',
        'u.email AS "user_email"',
        'u."displayName" AS "user_displayName"',
      ])
      .orderBy('p."createdAt"', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const data = raw.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      userId: r.userId as string,
      packageId: r.packageId as string,
      diamondAmount: Number(r.diamondAmount),
      bonusDiamonds: Number(r.bonusDiamonds),
      totalDiamonds: Number(r.totalDiamonds),
      amountUsd: Number(r.amountUsd),
      stripePaymentId: (r.stripePaymentId as string) || null,
      status: r.status as string,
      createdAt: r.createdAt as string,
      user: r.user_id ? { id: r.user_id as string, email: r.user_email as string, displayName: r.user_displayName as string } : null,
    }));

    return { data, total, page, limit };
  }

  async getPackages(token: string) {
    return this.proxyGet('/diamond-packages', token);
  }

  async createPackage(dto: Record<string, unknown>, token: string) {
    return this.proxyPost('/diamond-packages', dto, token);
  }

  async updatePackage(id: string, dto: Record<string, unknown>, token: string) {
    return this.proxyPut(`/diamond-packages/${id}`, dto, token);
  }

  async deletePackage(id: string, token: string) {
    return this.proxyDelete(`/diamond-packages/${id}`, token);
  }

  async getConfig(token: string) {
    return this.proxyGet('/diamonds/config', token);
  }

  async updateConfig(dto: Record<string, unknown>, token: string) {
    return this.proxyPut('/diamonds/config', dto, token);
  }
}
