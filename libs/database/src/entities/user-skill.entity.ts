import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SkillEntity } from './skill.entity';

@Entity('user_skills')
@Unique(['userId', 'skillId'])
@Index('idx_user_skills_user_id', ['userId'])
@Index('idx_user_skills_skill_id', ['skillId'])
@Index('idx_user_skills_highlight', ['userId', 'isHighlight'])
export class UserSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  skillId!: string;

  @Column('int', { nullable: true })
  proficiencyLevel!: number | null;

  @Column('boolean', { default: false })
  isHighlight!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @ManyToOne(() => SkillEntity)
  @JoinColumn({ name: 'skillId' })
  skill!: SkillEntity;
}
