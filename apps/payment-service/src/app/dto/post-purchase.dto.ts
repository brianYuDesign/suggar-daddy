import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePostPurchaseDto {
  @IsString()
  postId!: string;

  @IsString()
  buyerId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  stripePaymentId?: string;
}
