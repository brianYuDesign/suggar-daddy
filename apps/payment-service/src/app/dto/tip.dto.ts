import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateTipDto {
  @IsString()
  fromUserId!: string;

  @IsString()
  toUserId!: string;

  @IsNumber()
  @Min(0)
  @Max(999999)
  amount!: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  stripePaymentId?: string;
}
