import { IsUUID, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  contentId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProcessPaymentDto {
  @IsString()
  stripeToken: string;

  @IsString()
  paymentId: string;
}

export class RefundPaymentDto {
  @IsString()
  paymentId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentResponseDto {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  stripePaymentId?: string;
  createdAt: Date;
  processedAt?: Date;
}
