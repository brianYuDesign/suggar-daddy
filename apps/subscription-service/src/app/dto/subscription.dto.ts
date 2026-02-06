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
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn(['active', 'cancelled', 'expired'])
  status?: string;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;
}
