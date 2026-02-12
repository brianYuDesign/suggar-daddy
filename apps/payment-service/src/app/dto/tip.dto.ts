import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateTipDto {
  @IsString()
  fromUserId!: string;

  @IsString()
  toUserId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  stripePaymentId?: string;
}
