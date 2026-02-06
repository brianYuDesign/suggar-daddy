import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateMediaUploadDto {
  @IsString()
  userId: string;

  @IsString()
  filename: string;

  @IsIn(['image', 'video', 'audio'])
  mediaType: string;

  @IsString()
  storagePath: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  metadata?: object;
}
