import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateTipDto {
  @IsString()
  fromUserId!: string;

  @IsString()
  toUserId!: string;

  @IsInt()
  @Min(1)
  @Max(999999)
  amount!: number; // diamonds

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  postId?: string;
}
