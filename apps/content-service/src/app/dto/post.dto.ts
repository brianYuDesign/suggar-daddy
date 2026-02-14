import { IsString, IsOptional, IsNumber, IsArray, IsIn, Min, MaxLength, ArrayMaxSize, IsUrl } from 'class-validator';

export interface VideoMetaInput {
  mediaId: string;
  s3Key: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  duration?: number;
}

export class CreatePostDto {
  @IsString()
  creatorId: string;

  @IsIn(['text', 'image', 'video'])
  contentType: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
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

  @IsOptional()
  videoMeta?: VideoMetaInput;
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
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
