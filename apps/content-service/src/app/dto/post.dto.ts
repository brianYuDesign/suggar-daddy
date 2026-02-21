import { IsString, IsOptional, IsInt, IsArray, IsIn, Min, MaxLength, ArrayMaxSize, Matches } from 'class-validator';

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
  @Matches(/^(https?:\/\/|\/uploads\/)/, { each: true, message: 'each value in mediaUrls must be a URL or a local upload path' })
  mediaUrls: string[];

  @IsIn(['public', 'subscribers', 'tier_specific', 'ppv'])
  visibility: string;

  @IsOptional()
  @IsString()
  requiredTierId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  ppvPrice?: number; // diamonds

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
  @IsInt()
  @Min(1)
  ppvPrice?: number; // diamonds
}
