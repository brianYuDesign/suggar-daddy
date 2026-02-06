import { IsString, IsOptional, IsNumber, IsArray, IsIn, Min } from 'class-validator';

export class CreatePostDto {
  @IsString()
  creatorId: string;

  @IsIn(['text', 'image', 'video'])
  contentType: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsArray()
  @IsString({ each: true })
  mediaUrls: string[];

  @IsIn(['public', 'subscribers', 'tier_specific', 'ppv'])
  visibility: string;

  @IsOptional()
  @IsString()
  requiredTierId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ppvPrice?: number;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsIn(['public', 'subscribers', 'tier_specific', 'ppv'])
  visibility?: string;

  @IsOptional()
  @IsString()
  requiredTierId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ppvPrice?: number;
}
