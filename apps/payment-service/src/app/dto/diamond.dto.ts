import { IsString, IsInt, IsOptional, IsNotEmpty, Min, Max, MaxLength, IsBoolean, IsNumber } from 'class-validator';

export class SpendDiamondsDto {
  @IsNumber()
  @Min(1)
  @Max(10000)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  referenceType!: string; // 'undo' | 'reveal' | 'super_like' | 'boost' | 'tip' | 'ppv' | 'dm_unlock'

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

export class TransferDiamondsDto {
  @IsString()
  toUserId!: string;

  @IsInt()
  @Min(1)
  @Max(999999)
  amount!: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ConvertDiamondsDto {
  @IsInt()
  @Min(100)
  @Max(9999999)
  amount!: number;
}

export class PurchaseDiamondsDto {
  @IsString()
  packageId!: string;
}

export class AdminAdjustBalanceDto {
  @IsString()
  userId!: string;

  @IsInt()
  @Min(-999999)
  @Max(999999)
  amount!: number;

  @IsString()
  reason!: string;
}

export class UpdateDiamondConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  superLikeCost?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boostCost?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  boostDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  conversionRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  platformFeeRate?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minConversionDiamonds?: number;
}

export class CreateDiamondPackageDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  diamondAmount!: number;

  @IsInt()
  @Min(0)
  bonusDiamonds!: number;

  @IsNumber()
  @Min(0.01)
  priceUsd!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
