import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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

@Entity('skills')
@Index('idx_skills_category', ['category'])
@Index('idx_skills_active', ['isActive'])
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: SkillCategory,
  })
  category!: SkillCategory;

  @Column('varchar', { length: 100 })
  name!: string;

  @Column('varchar', { length: 100 })
  nameEn!: string;

  @Column('varchar', { length: 100 })
  nameZhTw!: string;

  @Column('varchar', { length: 500, nullable: true })
  icon!: string | null;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('int', { default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
