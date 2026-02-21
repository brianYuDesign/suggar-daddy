import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreatePostPurchaseDto {
  @IsString()
  postId!: string;

  @IsString()
  buyerId!: string;

  @IsInt()
  @Min(1)
  @Max(999999)
  amount!: number; // diamonds

  @IsOptional()
  @IsString()
  creatorId?: string;
}
