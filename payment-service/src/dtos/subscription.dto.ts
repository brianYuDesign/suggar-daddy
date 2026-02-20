import { IsUUID, IsString, IsEnum, IsBoolean, IsOptional, IsDate } from 'class-validator';
import { BillingCycle } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsString()
  planId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsString()
  stripePaymentMethodId: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsString()
  planId?: string;
}

export class CancelSubscriptionDto {
  @IsString()
  subscriptionId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  planId: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  nextBillingDate?: Date;
  createdAt: Date;
}
