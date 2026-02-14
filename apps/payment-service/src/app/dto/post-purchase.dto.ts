import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreatePostPurchaseDto {
  @IsString()
  postId!: string;

  @IsString()
  buyerId!: string;

  @IsNumber()
  @Min(0)
  @Max(999999)
  amount!: number;

  @IsOptional()
  @IsString()
  stripePaymentId?: string;
}
