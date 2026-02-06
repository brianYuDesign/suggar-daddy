import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  subscriberId: string;

  @IsString()
  creatorId: string;

  @IsString()
  tierId: string;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  currentPeriodEnd?: string;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn(['active', 'cancelled', 'expired'])
  status?: string;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;
}
