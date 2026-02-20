import { IsUUID, IsString, IsDate, IsOptional } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsString()
  description: string;

  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class InvoiceResponseDto {
  id: string;
  userId: string;
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  dueDate: Date;
  s3Url?: string;
  createdAt: Date;
}

export class SendInvoiceDto {
  @IsString()
  invoiceId: string;

  @IsString()
  email: string;
}
