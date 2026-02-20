import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  planId: string;

  @IsOptional()
  @IsString()
  stripeToken?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(['active', 'paused', 'cancelled'])
  status?: string;

  @IsOptional()
  autoRenew?: boolean;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  monthlyPrice: number;
  billingCycleCount: number;
  autoRenew: boolean;
  createdAt: Date;
}
