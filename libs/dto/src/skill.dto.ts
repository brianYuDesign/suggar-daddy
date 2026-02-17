/**
 * Skill 相關 DTO
 */
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export enum SkillCategory {
  // 個人特質與興趣
  APPEARANCE = 'appearance',
  PERSONALITY = 'personality',
  HOBBY = 'hobby',
  LIFESTYLE = 'lifestyle',
  
  // 才藝與專長
  TALENT = 'talent',
  LANGUAGE = 'language',
  EDUCATION = 'education',
  PROFESSION = 'profession',
  
  // Creator 服務類型
  CONTENT_TYPE = 'content_type',
  SERVICE_TYPE = 'service_type',
  INTERACTION_STYLE = 'interaction_style',
  
  // 配對偏好
  SEEKING = 'seeking',
  DATE_ACTIVITY = 'date_activity',
}

export interface SkillDto {
  id: string;
  category: SkillCategory;
  name: string;
  nameEn: string;
  nameZhTw: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface UserSkillDto {
  id: string;
  userId: string;
  skillId: string;
  proficiencyLevel?: number;
  isHighlight: boolean;
  skill?: SkillDto;
  createdAt: Date;
}

/** 建立技能（Admin） */
export class CreateSkillDto {
  @IsEnum(SkillCategory)
  category: SkillCategory;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @IsString()
  @IsNotEmpty()
  nameZhTw: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

/** 更新技能（Admin） */
export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameEn?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nameZhTw?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

/** 新增用戶技能 */
export class AddUserSkillDto {
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  proficiencyLevel?: number;

  @IsOptional()
  @IsBoolean()
  isHighlight?: boolean;
}

/** 更新用戶技能 */
export class UpdateUserSkillDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  proficiencyLevel?: number;

  @IsOptional()
  @IsBoolean()
  isHighlight?: boolean;
}

/** 技能查詢參數 */
export interface GetSkillsQueryDto {
  category?: SkillCategory;
  isActive?: boolean;
  locale?: string;
}
