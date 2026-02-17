import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { SkillEntity } from './skill.entity';

export enum SkillRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('skill_requests')
@Index('idx_skill_requests_user_id', ['userId'])
@Index('idx_skill_requests_status', ['status'])
@Index('idx_skill_requests_created_at', ['createdAt'])
@Index('idx_skill_requests_reviewer', ['reviewedBy'])
export class SkillRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('varchar', { length: 50 })
  category!: string;

  @Column('varchar', { length: 100 })
  suggestedName!: string;

  @Column('varchar', { length: 100 })
  suggestedNameEn!: string;

  @Column('varchar', { length: 100 })
  suggestedNameZhTw!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: SkillRequestStatus.PENDING,
  })
  status!: SkillRequestStatus;

  @Column('uuid', { nullable: true })
  reviewedBy!: string | null;

  @Column('timestamp', { nullable: true })
  reviewedAt!: Date | null;

  @Column('text', { nullable: true })
  rejectionReason!: string | null;

  @Column('uuid', { nullable: true })
  createdSkillId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewedBy' })
  reviewer!: UserEntity | null;

  @ManyToOne(() => SkillEntity)
  @JoinColumn({ name: 'createdSkillId' })
  createdSkill!: SkillEntity | null;
}
