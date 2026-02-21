import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SpendDiamondsResult {
  balance: number;
  cost: number;
}

export interface BoostResult {
  balance: number;
  cost: number;
  expiresAt: string;
}

@Injectable()
export class PaymentServiceClient {
  private readonly logger = new Logger(PaymentServiceClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'PAYMENT_SERVICE_URL',
      'http://localhost:3007'
    ).replace(/\/$/, '');
  }

  async spendOnSuperLike(userId: string, authToken: string): Promise<SpendDiamondsResult> {
    const url = `${this.baseUrl}/diamonds/spend-super-like`;
    this.logger.debug(`spendOnSuperLike userId=${userId}`);
    const res = await axios.post<SpendDiamondsResult>(
      url,
      { userId },
      {
        timeout: 10000,
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    return res.data;
  }

  async spendOnBoost(userId: string, authToken: string): Promise<BoostResult> {
    const url = `${this.baseUrl}/diamonds/spend-boost`;
    this.logger.debug(`spendOnBoost userId=${userId}`);
    const res = await axios.post<BoostResult>(
      url,
      { userId },
      {
        timeout: 10000,
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    return res.data;
  }

  async spendDiamonds(
    userId: string,
    amount: number,
    referenceType: string,
    authToken: string,
    description?: string,
  ): Promise<SpendDiamondsResult> {
    const url = `${this.baseUrl}/diamonds/spend`;
    this.logger.debug(`spendDiamonds userId=${userId} amount=${amount} type=${referenceType}`);
    const res = await axios.post<SpendDiamondsResult>(
      url,
      { amount, referenceType, description },
      {
        timeout: 10000,
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    return res.data;
  }

  async getDiamondConfig(): Promise<{
    superLikeCost: number;
    boostCost: number;
    boostDurationMinutes: number;
  }> {
    const url = `${this.baseUrl}/diamonds/config`;
    const res = await axios.get(url, { timeout: 5000 });
    return res.data;
  }
}
