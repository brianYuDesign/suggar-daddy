import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PageStatus, PageType } from '../entities/static-page.entity';

export class CreateStaticPageDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  slug?: string;

  @IsOptional()
  @IsEnum(PageType)
  pageType?: PageType;

  @IsOptional()
  @IsEnum(PageStatus)
  status?: PageStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;
}
