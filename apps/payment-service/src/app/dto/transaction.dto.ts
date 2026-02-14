import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  userId!: string;

  @IsIn(['subscription', 'ppv', 'tip'])
  type!: string;

  @IsNumber()
  @Min(0)
  @Max(999999)
  amount!: number;

  @IsOptional()
  @IsString()
  stripePaymentId?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  metadata?: object;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsIn(['pending', 'succeeded', 'failed', 'refunded'])
  status?: string;

  @IsOptional()
  @IsString()
  stripePaymentId?: string;

  @IsOptional()
  metadata?: object;
}
