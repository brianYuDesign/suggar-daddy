import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';

export class RequestWithdrawalDto {
  @IsNumber()
  @Min(20, { message: 'Minimum withdrawal amount is $20' })
  @Max(50000, { message: 'Maximum withdrawal amount is $50,000' })
  amount!: number;

  @IsString()
  @IsIn(['bank_transfer', 'stripe_payout'], {
    message: 'payoutMethod must be bank_transfer or stripe_payout',
  })
  payoutMethod!: string;

  @IsOptional()
  @IsString()
  payoutDetails?: string;
}

export class ProcessWithdrawalDto {
  @IsString()
  @IsIn(['approve', 'reject'], {
    message: 'action must be approve or reject',
  })
  action!: 'approve' | 'reject';
}
