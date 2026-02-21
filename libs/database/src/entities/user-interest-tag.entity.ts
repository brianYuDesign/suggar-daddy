import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { InterestTagEntity } from './interest-tag.entity';

@Entity('user_interest_tags')
@Unique(['userId', 'tagId'])
@Index('idx_user_interest_tags_user', ['userId'])
@Index('idx_user_interest_tags_tag', ['tagId'])
export class UserInterestTagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  tagId!: string;

  @ManyToOne(() => InterestTagEntity, { eager: true })
  @JoinColumn({ name: 'tagId' })
  tag!: InterestTagEntity;

  @CreateDateColumn()
  createdAt!: Date;
}
